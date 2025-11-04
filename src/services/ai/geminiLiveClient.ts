/**
 * Gemini Live Client for Real-time Coaching Signals
 *
 * Parallel pipeline that processes interview transcription in real-time
 * to extract coaching signals for candidate guidance.
 *
 * Target Latency: <700ms from speech to signal emission
 *
 * EP3-S4: Real-time AI Interview Interface - Coaching Signal Extraction
 */

import type {
  CoachingSignal,
  CoachingSignalType,
} from '../../components/interview/CoachingSignals';

/**
 * Gemini Live connection state
 */
export type GeminiLiveState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Gemini Live configuration
 */
export interface GeminiLiveConfig {
  apiKey: string;
  endpoint?: string; // Optional custom endpoint
  model?: string; // Default: gemini-1.5-flash for low latency
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

/**
 * Transcription delta for processing
 */
export interface TranscriptionDelta {
  text: string;
  speaker: 'ai' | 'user';
  timestamp: Date;
  isPartial: boolean; // True if speech still ongoing
}

/**
 * Coaching signal detection result
 */
export interface SignalDetection {
  signal: CoachingSignal;
  confidence: number;
  latencyMs: number; // Time from transcription to detection
  context?: string; // What triggered the signal
}

/**
 * Gemini Live event handlers
 */
export interface GeminiLiveEventHandlers {
  onStateChange?: (_state: GeminiLiveState) => void;
  onSignalDetected?: (_detection: SignalDetection) => void;
  onError?: (_error: Error) => void;
  onLatencyWarning?: (_latencyMs: number) => void;
}

/**
 * Gemini Live Client
 */
export class GeminiLiveClient {
  private config: Required<GeminiLiveConfig>;
  private state: GeminiLiveState = 'disconnected';
  private eventHandlers: GeminiLiveEventHandlers;
  private reconnectAttempts = 0;
  private sessionId?: string;
  private transcriptionBuffer: TranscriptionDelta[] = [];
  private processingQueue: Promise<void> = Promise.resolve();
  private abortController?: AbortController;

  constructor(
    config: GeminiLiveConfig,
    handlers: GeminiLiveEventHandlers = {}
  ) {
    this.config = {
      apiKey: config.apiKey,
      endpoint:
        config.endpoint || 'https://generativelanguage.googleapis.com/v1beta',
      model: config.model || 'gemini-1.5-flash',
      maxReconnectAttempts: config.maxReconnectAttempts ?? 3,
      reconnectDelayMs: config.reconnectDelayMs ?? 2000,
    };
    this.eventHandlers = handlers;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(interviewSessionId: string): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.sessionId = interviewSessionId;
    this.setState('connecting');
    this.abortController = new AbortController();

    try {
      // Initialize Gemini Live session with coaching signal extraction prompt
      await this.initializeSession();
      this.setState('connected');
      this.reconnectAttempts = 0;
    } catch (error) {
      this.setState('error');
      this.eventHandlers.onError?.(error as Error);

      // Attempt reconnection
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          this.connect(interviewSessionId);
        }, this.config.reconnectDelayMs);
      }
    }
  }

  /**
   * Disconnect from Gemini Live
   */
  disconnect(): void {
    this.abortController?.abort();
    this.setState('disconnected');
    this.sessionId = undefined;
    this.transcriptionBuffer = [];
  }

  /**
   * Send transcription delta for real-time processing
   */
  async sendTranscriptionDelta(delta: TranscriptionDelta): Promise<void> {
    if (this.state !== 'connected') {
      return;
    }

    // Only process user speech (not AI questions)
    if (delta.speaker !== 'user') {
      return;
    }

    // Add to buffer
    this.transcriptionBuffer.push(delta);

    // Process in queue to maintain order
    this.processingQueue = this.processingQueue.then(async () => {
      await this.processTranscriptionBuffer();
    });
  }

  /**
   * Get current connection state
   */
  getState(): GeminiLiveState {
    return this.state;
  }

  /**
   * Get session latency metrics
   */
  getLatencyMetrics(): {
    averageLatencyMs: number;
    maxLatencyMs: number;
    signalsDetected: number;
  } {
    // TODO: Implement latency tracking
    return {
      averageLatencyMs: 0,
      maxLatencyMs: 0,
      signalsDetected: 0,
    };
  }

  /**
   * Initialize Gemini Live session with coaching prompt
   */
  private async initializeSession(): Promise<void> {
    const systemPrompt = this.generateCoachingPrompt();

    // TODO: Actual Gemini Live API integration
    // For now, this is a placeholder for the real implementation
    // The actual implementation would use Google's Gemini Live API
    // which provides real-time streaming responses

    // Simulated initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(
        '[GeminiLive] Session initialized with prompt:',
        systemPrompt.substring(0, 100) + '...'
      );
    }
  }

  /**
   * Generate coaching signal extraction prompt
   */
  private generateCoachingPrompt(): string {
    return `ROLE: Real-time Interview Coaching Signal Analyzer

TASK: Analyze candidate responses in real-time and emit coaching signals when detected.
Respond ONLY with signal type and confidence. No explanations.

COACHING SIGNALS:
1. off_topic - Response wanders from the question scope
2. answer_too_long - Response exceeds optimal length (>2 minutes)
3. low_confidence - Excessive hedging, uncertainty, or filler words
4. unclear_explanation - Lacks structure, jumps topics, or is confusing
5. missing_structure - No clear intro/body/conclusion or logical flow
6. incorrect_fact - Factually wrong technical statement

RESPONSE FORMAT (JSON only):
{
  "signal": "signal_type" | null,
  "confidence": 0.0-1.0,
  "context": "brief reason"
}

RULES:
- Emit signal ONLY when confidence ≥0.7
- Consider full context, not individual words
- Prioritize accuracy over speed
- Never emit multiple signals for same utterance
- Respond within 500ms of receiving text

CURRENT INTERVIEW CONTEXT:
Session: ${this.sessionId}
Focus: Technical interview coaching for real-time improvement`;
  }

  /**
   * Process transcription buffer and detect signals
   */
  private async processTranscriptionBuffer(): Promise<void> {
    if (this.transcriptionBuffer.length === 0) {
      return;
    }

    // Get recent transcription (last 5 deltas for context)
    const recentDeltas = this.transcriptionBuffer.slice(-5);
    const fullText = recentDeltas.map(d => d.text).join(' ');

    // Skip if text too short
    if (fullText.length < 20) {
      return;
    }

    const startTime = Date.now();

    try {
      // Detect signals using Gemini Live
      const lastDelta = recentDeltas[recentDeltas.length - 1];
      if (!lastDelta) return;

      const detection = await this.detectSignals(fullText, lastDelta);

      if (detection) {
        const latencyMs = Date.now() - startTime;

        // Emit signal
        this.eventHandlers.onSignalDetected?.(detection);

        // Warn if latency exceeds target
        if (latencyMs > 700) {
          this.eventHandlers.onLatencyWarning?.(latencyMs);
        }

        // Clear buffer after processing
        this.transcriptionBuffer = [];
      }
    } catch (error) {
      this.eventHandlers.onError?.(error as Error);
    }
  }

  /**
   * Detect coaching signals from transcription
   */
  private async detectSignals(
    text: string,
    lastDelta: TranscriptionDelta
  ): Promise<SignalDetection | null> {
    // TODO: Actual Gemini Live API call
    // This is a placeholder for the real-time signal detection
    // The actual implementation would stream to Gemini Live API

    // For now, use heuristic-based detection as fallback
    return this.heuristicSignalDetection(text, lastDelta);
  }

  /**
   * Heuristic-based signal detection (fallback/dev mode)
   */
  private heuristicSignalDetection(
    text: string,
    delta: TranscriptionDelta
  ): SignalDetection | null {
    const lowerText = text.toLowerCase();
    const words = text.split(/\s+/);

    // Detect off_topic
    if (this.detectOffTopic(lowerText)) {
      return {
        signal: {
          type: 'off_topic',
          severity: 'warning',
          message: 'Try to focus on the technical requirements of the question',
          timestamp: delta.timestamp,
          confidence: 0.75,
        },
        confidence: 0.75,
        latencyMs: 0,
        context: 'Response wandered from question scope',
      };
    }

    // Detect answer_too_long
    if (words.length > 300) {
      return {
        signal: {
          type: 'answer_too_long',
          severity: 'warning',
          message: 'Consider summarizing your key points',
          timestamp: delta.timestamp,
          confidence: 0.8,
        },
        confidence: 0.8,
        latencyMs: 0,
        context: 'Response exceeded optimal length',
      };
    }

    // Detect low_confidence
    const uncertaintyWords = [
      'maybe',
      'i think',
      'probably',
      'not sure',
      'um',
      'uh',
      'like',
    ];
    const uncertaintyCount = uncertaintyWords.filter(word =>
      lowerText.includes(word)
    ).length;
    if (uncertaintyCount >= 5) {
      return {
        signal: {
          type: 'low_confidence',
          severity: 'info',
          message: 'Speak with confidence - you know this!',
          timestamp: delta.timestamp,
          confidence: 0.7,
        },
        confidence: 0.7,
        latencyMs: 0,
        context: 'Multiple hedging phrases detected',
      };
    }

    // Detect missing_structure
    if (words.length > 100 && !this.hasStructure(lowerText)) {
      return {
        signal: {
          type: 'missing_structure',
          severity: 'warning',
          message: 'Structure your answer: intro → steps → conclusion',
          timestamp: delta.timestamp,
          confidence: 0.72,
        },
        confidence: 0.72,
        latencyMs: 0,
        context: 'No clear structure detected in longer response',
      };
    }

    return null;
  }

  /**
   * Detect if response is off-topic
   */
  private detectOffTopic(text: string): boolean {
    // Heuristic: Check for common off-topic indicators
    const offTopicPhrases = [
      'by the way',
      'off topic',
      'speaking of which',
      'this reminds me',
      'fun fact',
    ];

    return offTopicPhrases.some(phrase => text.includes(phrase));
  }

  /**
   * Check if response has clear structure
   */
  private hasStructure(text: string): boolean {
    // Heuristic: Look for structural markers
    const structureMarkers = [
      'first',
      'second',
      'third',
      'firstly',
      'secondly',
      'finally',
      'to start',
      'next',
      'in conclusion',
      'step 1',
      'step 2',
      'step 3',
    ];

    const markerCount = structureMarkers.filter(marker =>
      text.includes(marker)
    ).length;
    return markerCount >= 2;
  }

  /**
   * Update client state and notify handlers
   */
  private setState(newState: GeminiLiveState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.eventHandlers.onStateChange?.(newState);
    }
  }
}

/**
 * Create Gemini Live client instance
 */
export function createGeminiLiveClient(
  config: GeminiLiveConfig,
  handlers?: GeminiLiveEventHandlers
): GeminiLiveClient {
  return new GeminiLiveClient(config, handlers);
}

/**
 * Utility: Map signal type to UI coaching message
 */
export function getCoachingMessage(signalType: CoachingSignalType): string {
  const messages: Record<CoachingSignalType, string> = {
    off_topic: 'Try to focus on the technical requirements of the question',
    answer_too_long: 'Consider summarizing your key points concisely',
    low_confidence: 'Speak with confidence - you know this!',
    unclear_explanation: 'Break down your explanation into clear steps',
    missing_structure: 'Structure your answer: intro → steps → conclusion',
    incorrect_fact: 'Double-check that technical detail',
  };

  return messages[signalType] || 'Keep going!';
}
