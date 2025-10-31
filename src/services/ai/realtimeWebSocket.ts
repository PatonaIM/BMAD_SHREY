/**
 * WebSocket Manager for OpenAI Realtime API
 *
 * Handles bidirectional audio streaming with OpenAI's Realtime API
 * for conducting AI-powered interviews.
 *
 * Architecture:
 * - Client-side only (browser WebSocket)
 * - PCM16 24kHz mono audio format
 * - Event-driven message handling
 * - Automatic reconnection on errors
 *
 * @see https://platform.openai.com/docs/guides/realtime
 */

export type RealtimeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'closed';

export interface RealtimeSessionConfig {
  instructions: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  inputAudioTranscription?: {
    model?: 'whisper-1';
  };
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  temperature?: number;
  maxOutputTokens?: number;
}

export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

export interface RealtimeEventHandlers {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (_error: Error) => void;

  // Session events
  onSessionCreated?: (_event: RealtimeEvent) => void;
  onSessionUpdated?: (_event: RealtimeEvent) => void;

  // Audio events
  onAudioDelta?: (_audioData: ArrayBuffer) => void;
  onAudioDone?: () => void;
  onAudioTranscriptDelta?: (_delta: string) => void;
  onAudioTranscriptDone?: (_transcript: string) => void;

  // Conversation events
  onConversationItemCreated?: (_item: RealtimeEvent) => void;
  onResponseCreated?: (_response: RealtimeEvent) => void;
  onResponseDone?: (_response: RealtimeEvent) => void;

  // Input audio events
  onInputAudioBufferSpeechStarted?: () => void;
  onInputAudioBufferSpeechStopped?: () => void;
  onInputAudioBufferCommitted?: () => void;

  // Generic message handler (all events)
  onMessage?: (_event: RealtimeEvent) => void;
}

export class RealtimeWebSocketManager {
  private ws: WebSocket | null = null;
  private connectionState: RealtimeConnectionState = 'disconnected';
  private sessionToken: string | null = null;
  private handlers: RealtimeEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000; // ms
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isProcessingQueue = false;

  constructor(sessionToken: string, handlers?: RealtimeEventHandlers) {
    this.sessionToken = sessionToken;
    this.handlers = handlers || {};
  }

  /**
   * Get current connection state
   */
  getState(): RealtimeConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected and ready
   */
  isConnected(): boolean {
    return (
      this.connectionState === 'connected' &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<void> {
    if (
      this.connectionState === 'connecting' ||
      this.connectionState === 'connected'
    ) {
      return;
    }

    this.setConnectionState('connecting');

    return new Promise((resolve, reject) => {
      try {
        // OpenAI Realtime API uses ephemeral token in URL for browser clients
        const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;

        // Browser WebSocket doesn't support headers, so we pass protocols array
        // with the authorization token and OpenAI-Beta header as protocols
        this.ws = new WebSocket(url, [
          'realtime',
          `openai-insecure-api-key.${this.sessionToken}`,
          'openai-beta.realtime-v1',
        ]);

        // Store resolve/reject for use in handlers
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {
            const error = new Error('Connection timeout');
            this.handleError(error);
            this.disconnect();
            reject(error);
          }
        }, 10000);

        // Set up temporary handlers for connection
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.handlers.onConnected?.();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onerror = _event => {
          clearTimeout(connectionTimeout);
          const error = new Error('WebSocket connection failed');
          this.handleError(error);
          reject(error);
        };

        // Set up the rest of the handlers
        this.setupWebSocketHandlers();
      } catch (error) {
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState('closed');
    this.handlers.onDisconnected?.();
  }

  /**
   * Update session configuration
   */
  updateSession(config: Partial<RealtimeSessionConfig>): void {
    if (!this.isConnected()) {
      throw new Error('Cannot update session: not connected');
    }

    this.sendEvent({
      type: 'session.update',
      session: config,
    });
  }

  /**
   * Send audio data to OpenAI (PCM16 format)
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected()) {
      return;
    }

    // Queue audio for reliable delivery
    this.audioQueue.push(audioData);
    this.processAudioQueue();
  }

  /**
   * Send audio buffer append event
   */
  appendAudioBuffer(audioBase64: string): void {
    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioBase64,
    });
  }

  /**
   * Commit the audio buffer (trigger AI response)
   */
  commitAudioBuffer(): void {
    this.sendEvent({
      type: 'input_audio_buffer.commit',
    });
  }

  /**
   * Clear the audio input buffer
   */
  clearAudioBuffer(): void {
    this.sendEvent({
      type: 'input_audio_buffer.clear',
    });
  }

  /**
   * Cancel current AI response
   */
  cancelResponse(): void {
    this.sendEvent({
      type: 'response.cancel',
    });
  }

  /**
   * Trigger AI to generate a response (e.g., ask a question)
   */
  createResponse(): void {
    this.sendEvent({
      type: 'response.create',
    });
  }

  /**
   * Send a text message (for debugging or text fallback)
   */
  sendTextMessage(text: string): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    });

    // Trigger response
    this.sendEvent({
      type: 'response.create',
    });
  }

  /**
   * Send generic event to OpenAI
   */
  private sendEvent(event: RealtimeEvent): void {
    if (!this.isConnected() || !this.ws) {
      return;
    }

    try {
      this.ws.send(JSON.stringify(event));
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Process queued audio data
   */
  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0 && this.isConnected()) {
      const audioData = this.audioQueue.shift();
      if (audioData) {
        // Convert ArrayBuffer to base64
        const base64 = this.arrayBufferToBase64(audioData);
        this.appendAudioBuffer(base64);

        // Small delay to avoid overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    // Note: onopen is set in connect() to handle the Promise resolve
    // Only set up the other handlers here

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch {
        // Silent fail on parse error
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.setConnectionState('disconnected');
      this.handlers.onDisconnected?.();

      // Attempt reconnection if not a clean close
      if (
        event.code !== 1000 &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Handle server events
   */
  private handleServerEvent(event: RealtimeEvent): void {
    // Call generic handler
    this.handlers.onMessage?.(event);

    // Route to specific handlers
    switch (event.type) {
      case 'session.created':
        this.handlers.onSessionCreated?.(event);
        break;

      case 'session.updated':
        this.handlers.onSessionUpdated?.(event);
        break;

      case 'response.audio.delta':
        if (event.delta && typeof event.delta === 'string') {
          const audioBuffer = this.base64ToArrayBuffer(event.delta);
          this.handlers.onAudioDelta?.(audioBuffer);
        }
        break;

      case 'response.audio.done':
        this.handlers.onAudioDone?.();
        break;

      case 'response.audio_transcript.delta':
        if (event.delta && typeof event.delta === 'string') {
          this.handlers.onAudioTranscriptDelta?.(event.delta);
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript && typeof event.transcript === 'string') {
          this.handlers.onAudioTranscriptDone?.(event.transcript);
        }
        break;

      case 'conversation.item.created':
        this.handlers.onConversationItemCreated?.(event);
        break;

      case 'response.created':
        this.handlers.onResponseCreated?.(event);
        break;

      case 'response.done':
        this.handlers.onResponseDone?.(event);
        break;

      case 'input_audio_buffer.speech_started':
        this.handlers.onInputAudioBufferSpeechStarted?.();
        break;

      case 'input_audio_buffer.speech_stopped':
        this.handlers.onInputAudioBufferSpeechStopped?.();
        break;

      case 'input_audio_buffer.committed':
        this.handlers.onInputAudioBufferCommitted?.();
        break;

      case 'error':
        this.handleError(new Error(JSON.stringify(event)));
        break;

      default:
        // Unhandled event types logged only in development
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('Unhandled event type:', event.type);
        }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // OpenAI Realtime API doesn't require explicit ping
        // Connection stays alive with regular message flow
        // This just monitors the connection state
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.handleError(new Error('Connection lost'));
          this.disconnect();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this.connect();
    } catch {
      // Silent fail on reconnection attempt
    }
  }

  /**
   * Set connection state and notify
   */
  private setConnectionState(state: RealtimeConnectionState): void {
    this.connectionState = state;
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.setConnectionState('error');
    this.handlers.onError?.(error);
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCharCode(byte);
      }
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    this.disconnect();
    this.audioQueue = [];
    this.handlers = {};
    this.sessionToken = null;
  }
}
