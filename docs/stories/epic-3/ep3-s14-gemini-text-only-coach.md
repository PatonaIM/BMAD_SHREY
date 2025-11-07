# EP3-S14: Gemini 2.0 Live Text-Only Coaching Integration

**Epic:** 3 - Interactive AI Interview System  
**Story ID:** EP3-S14  
**Priority:** High  
**Effort:** 5 Story Points  
**Dependencies:** EP3-S12 (Split Panel Refactor)

---

## User Story

**As a** job candidate taking an AI interview,  
**I want** real-time coaching guidance displayed as text suggestions,  
**So that** I can improve my responses without disrupting the conversation flow.

**As a** platform,  
**I want** Gemini 2.0 Live to analyze responses in parallel and provide silent coaching,  
**So that** we enhance candidate performance without interfering with the primary AI interviewer.

---

## Context & Motivation

### Current State Issues

**Gemini Current Implementation:**

- Heuristic-based signal detection (not real AI analysis)
- Processes transcripts with delayed feedback
- No integration with question context
- Limited coaching signal types
- Runs in same pipeline as OpenAI (complex)

**Problems:**

1. Coaching signals are basic pattern matching, not intelligent analysis
2. No awareness of what question was asked
3. Can't provide contextual guidance
4. Latency higher than target (>700ms)
5. Mixed responsibilities with OpenAI pipeline

### Desired Future State

**Gemini 2.0 Live Integration:**

- **Text-Only Mode:** No audio output, pure analysis
- **Question Context Aware:** Knows what question AI asked
- **Real-Time Analysis:** Processes user speech as it happens
- **Intelligent Coaching:** Uses LLM understanding for better signals
- **Parallel Pipeline:** Independent from OpenAI interviewer
- **Low Latency:** <700ms from speech end to signal display

**Architecture:**

```
┌─────────────────────────────────────────────┐
│                                             │
│  OpenAI Realtime (Primary Interviewer)     │
│  ↓                                          │
│  Asks Question: "Tell me about React..."   │
│  ↓                                          │
│  ├─→ Displayed to User                     │
│  └─→ Context Sent to Gemini ────────┐     │
│                                      ↓     │
│  User Responds (speech)              Gemini│
│  ↓                                   Receives│
│  OpenAI captures audio               Question│
│  ↓                                   Context│
│  User transcript generated           ↓     │
│  ↓                                   Analyzes│
│  └─→ Transcript Sent to Gemini ──→ Response│
│                                      ↓     │
│                            Coaching Signal │
│                            "Consider STAR" │
│                                      ↓     │
│                            Display in      │
│                            Helper Panel    │
└─────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### 1. Gemini 2.0 Live Connection

**API Configuration:**

```typescript
const geminiConfig = {
  model: 'gemini-2.0-flash-exp', // or latest stable
  mode: 'text-only',
  systemPrompt: `You are a silent interview coach analyzing candidate responses in real-time.

Context: You will receive:
1. The interview question asked by the AI
2. The candidate's response (streaming or complete)

Your role:
- Analyze response quality, structure, relevance, depth
- Provide brief, actionable coaching signals
- Focus on helping candidate improve without interrupting

Output format: JSON
{
  "signal_type": "structure|clarity|relevance|depth|conciseness|confidence",
  "message": "Brief coaching text (1 sentence)",
  "priority": "info|suggestion|important",
  "confidence": 0.0-1.0
}

Rules:
- Be supportive and constructive
- One signal at a time
- Only emit if confidence >0.7
- Keep messages under 20 words
`,
  temperature: 0.3, // Low temperature for consistent analysis
  maxOutputTokens: 100, // Short coaching messages only
};
```

**Connection Requirements:**

- [ ] WebSocket connection to Gemini 2.0 Live API
- [ ] Text-only mode enforced (no audio generation)
- [ ] System prompt configures coaching behavior
- [ ] Independent from OpenAI connection
- [ ] Auto-reconnect on disconnect (max 3 attempts)
- [ ] Graceful degradation if unavailable (interview continues)

**MUST:**

- [ ] Connection established within 2 seconds
- [ ] No audio output from Gemini (text mode verified)
- [ ] Connection resilient to temporary network issues
- [ ] Clear error messaging if connection fails
- [ ] Interview not blocked by Gemini connection issues

### 2. Question Context Flow

**Data Flow:**

```typescript
// When OpenAI asks a question
AIInterviewPanel.onQuestionAsked = (question: string) => {
  // 1. Display question to user
  setCurrentQuestion(question);

  // 2. Send question context to Gemini
  geminiClient.sendQuestionContext({
    questionText: question,
    questionCategory: categorizeQuestion(question),
    timestamp: new Date(),
    expectedResponseType: inferExpectedResponse(question),
  });
};
```

**Question Context Structure:**

```typescript
interface QuestionContext {
  questionText: string;
  questionCategory: 'technical' | 'behavioral' | 'situational' | 'experience';
  timestamp: Date;
  expectedResponseType: 'code' | 'story' | 'explanation' | 'opinion';
  keyTopics?: string[]; // Extracted from question (e.g., ["React", "state management"])
}
```

**Requirements:**

- [ ] Question context sent immediately when AI asks (<50ms)
- [ ] Context includes question text and categorization
- [ ] Optional: Extract key topics from question for better analysis
- [ ] Gemini receives context before user starts responding
- [ ] Context includes expected response type hint

**MUST:**

- [ ] Zero latency impact on user experience
- [ ] Context transmission non-blocking
- [ ] Question extraction accurate (>90%)
- [ ] Context format documented for Gemini prompt

### 3. User Response Analysis

**Trigger Points:**

```typescript
// Option A: Stream partial transcripts (real-time)
AIInterviewPanel.onUserSpeechDelta = (delta: string) => {
  geminiClient.sendTranscriptDelta({
    text: delta,
    speaker: 'user',
    isPartial: true,
    timestamp: new Date(),
  });
};

// Option B: Send complete response (after speech ends)
AIInterviewPanel.onUserSpeechComplete = (
  transcript: string,
  duration: number
) => {
  geminiClient.analyzeResponse({
    transcript,
    duration,
    questionContext: currentQuestion,
    timestamp: new Date(),
  });
};
```

**Analysis Triggers:**

- [ ] **Option A (Preferred):** Stream partial transcripts for real-time feedback
- [ ] **Option B (Fallback):** Analyze complete response after speech ends
- [ ] Gemini processes text incrementally if streaming
- [ ] Analysis considers question context in evaluation
- [ ] Multiple signals can be emitted for long responses

**MUST:**

- [ ] Analysis latency <700ms from speech end
- [ ] No blocking of main interview flow
- [ ] Handles incomplete/partial transcripts gracefully
- [ ] Context-aware analysis (knows what question was asked)

### 4. Coaching Signal Types & Format

**Signal Types:**

```typescript
type CoachingSignalType =
  | 'structure' // Response needs better organization (STAR, intro-body-conclusion)
  | 'clarity' // Unclear explanation, needs simplification
  | 'relevance' // Straying off-topic, refocus on question
  | 'depth' // Surface-level answer, needs more detail/examples
  | 'conciseness' // Overly long, rambling response
  | 'confidence' // Hesitant speech pattern, filler words
  | 'specificity' // Vague answer, needs concrete examples/numbers
  | 'technical' // Technical explanation inaccurate or incomplete
  | 'positive'; // Reinforcement for good response

interface CoachingSignal {
  type: CoachingSignalType;
  message: string; // Brief coaching text
  priority: 'info' | 'suggestion' | 'important';
  confidence: number; // 0.0-1.0, only show if >0.7
  timestamp: Date;
  questionId?: string; // Link to question being answered
}
```

**Example Signals:**

```json
[
  {
    "type": "structure",
    "message": "Consider using STAR format: Situation, Task, Action, Result",
    "priority": "suggestion",
    "confidence": 0.85
  },
  {
    "type": "specificity",
    "message": "Mention specific metrics or outcomes from your project",
    "priority": "important",
    "confidence": 0.92
  },
  {
    "type": "conciseness",
    "message": "Summarize key points - aim for 60-90 seconds",
    "priority": "info",
    "confidence": 0.78
  },
  {
    "type": "positive",
    "message": "Great explanation of trade-offs!",
    "priority": "info",
    "confidence": 0.95
  }
]
```

**Requirements:**

- [ ] Gemini outputs structured JSON with signal details
- [ ] Signal types cover common interview response issues
- [ ] Messages brief (<20 words) and actionable
- [ ] Confidence threshold enforced (only show >0.7)
- [ ] Positive reinforcement included (not just criticism)

**MUST:**

- [ ] Signal messages supportive and constructive
- [ ] No harsh or discouraging language
- [ ] One primary signal per analysis (avoid overwhelming user)
- [ ] Priority determines visual prominence

### 5. Helper Panel Display

**UI Layout:**

```
┌───────────────────────────────────┐
│   Interview Helper 💡             │
├───────────────────────────────────┤
│                                   │
│  Coaching Guidance:               │
│                                   │
│  ✓ Great explanation of React    │
│    hooks lifecycle!               │
│                                   │
│  💡 Consider mentioning specific  │
│     performance metrics           │
│                                   │
│  ⚠️ Response getting long -       │
│     summarize key points          │
│                                   │
│  [Clear All]                      │
│                                   │
└───────────────────────────────────┘
```

**Display Rules:**

- [ ] Signals appear in real-time as generated
- [ ] Max 3 signals visible at once (FIFO)
- [ ] Visual differentiation by priority (color, icon)
- [ ] Smooth fade-in animation (no jarring appearance)
- [ ] Auto-dismiss after 15 seconds (or manual clear)
- [ ] "Clear All" button to dismiss all signals

**Visual Design:**

- **Info (blue):** 💬 Icon, light blue background
- **Suggestion (amber):** 💡 Icon, light amber background
- **Important (red):** ⚠️ Icon, light red background
- **Positive (green):** ✓ Icon, light green background

**Accessibility:**

- [ ] Screen reader announces new signals
- [ ] Color not sole indicator (icons + text)
- [ ] Keyboard dismissal (Escape key)
- [ ] Focus management for screen reader users

**MUST:**

- [ ] Non-intrusive display (doesn't block interview)
- [ ] Readable font size (14-16px)
- [ ] High contrast for accessibility
- [ ] Smooth animations (no performance impact)

### 6. Error Handling & Fallbacks

**Gemini Connection Failures:**

```typescript
geminiClient.on('error', error => {
  // Log error but don't interrupt interview
  console.error('Gemini coaching unavailable:', error);

  // Show subtle indicator in helper panel
  setHelperStatus('Coaching temporarily unavailable');

  // Interview continues normally without coaching
  // OpenAI interviewer unaffected
});
```

**Fallback Modes:**

1. **Gemini Unavailable:** Show static helper tips (pre-written guidance)
2. **Latency Too High:** Skip real-time analysis, show post-response summary
3. **API Error:** Graceful retry (max 2 attempts), then disable coaching

**Requirements:**

- [ ] Interview never blocked by Gemini issues
- [ ] Clear status indicator in helper panel
- [ ] Fallback to static tips if Gemini unavailable
- [ ] Automatic retry on transient errors
- [ ] User informed if coaching unavailable

**MUST:**

- [ ] Zero impact on primary interview flow
- [ ] OpenAI connection independent
- [ ] Error logs structured for debugging
- [ ] Graceful degradation tested

### 7. Performance & Latency

**Target Metrics:**

- **Question Context Send:** <50ms
- **Response Analysis:** <700ms from speech end
- **Signal Display:** <100ms after analysis
- **Total Latency (End-to-End):** <850ms

**Optimization Strategies:**

- [ ] Send question context immediately (don't wait)
- [ ] Stream partial transcripts for incremental analysis
- [ ] Use Gemini 2.0 Flash (faster than Pro)
- [ ] Optimize API payload size
- [ ] Batch analysis if needed (trade latency for accuracy)

**Monitoring:**

```typescript
interface CoachingLatencyMetrics {
  questionContextLatency: number; // Time to send context
  analysisLatency: number; // Gemini processing time
  displayLatency: number; // UI render time
  totalLatency: number; // End-to-end
  errors: number; // Count of failed analyses
}
```

**MUST:**

- [ ] P50 latency <700ms
- [ ] P95 latency <1200ms
- [ ] P99 latency <2000ms
- [ ] Error rate <1%
- [ ] No memory leaks during 30-min session

---

## Technical Implementation

### Gemini Client Interface

```typescript
export class GeminiTextCoachClient {
  private ws: WebSocket | null = null;
  private questionContext: QuestionContext | null = null;
  private eventHandlers: EventHandlers;

  constructor(config: GeminiConfig, handlers: EventHandlers) {
    this.config = config;
    this.eventHandlers = handlers;
  }

  async connect(sessionId: string): Promise<void> {
    // Establish WebSocket to Gemini 2.0 Live API
    const url = `wss://generativelanguage.googleapis.com/v1/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Initialize with system prompt
      this.send({
        contents: [
          {
            role: 'system',
            parts: [{ text: this.config.systemPrompt }],
          },
        ],
      });

      this.eventHandlers.onConnected?.();
    };

    this.ws.onmessage = event => {
      const signal = this.parseCoachingSignal(event.data);
      if (signal) {
        this.eventHandlers.onSignalDetected?.(signal);
      }
    };
  }

  sendQuestionContext(context: QuestionContext): void {
    this.questionContext = context;

    // Send question context to Gemini
    this.send({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `QUESTION: ${context.questionText}\nCATEGORY: ${context.questionCategory}\nEXPECTED_RESPONSE: ${context.expectedResponseType}`,
            },
          ],
        },
      ],
    });
  }

  sendTranscriptDelta(delta: string): void {
    // Stream partial transcript for real-time analysis
    this.send({
      contents: [
        {
          role: 'user',
          parts: [{ text: `RESPONSE_PARTIAL: ${delta}` }],
        },
      ],
    });
  }

  analyzeCompleteResponse(transcript: string, duration: number): void {
    this.send({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `RESPONSE_COMPLETE: ${transcript}\nDURATION: ${duration}s\nANALYZE_AND_PROVIDE_COACHING`,
            },
          ],
        },
      ],
    });
  }

  private parseCoachingSignal(data: string): CoachingSignal | null {
    try {
      const response = JSON.parse(data);

      // Extract coaching signal from Gemini response
      const signalData = response.candidates[0]?.content?.parts[0]?.text;
      if (!signalData) return null;

      const signal = JSON.parse(signalData);

      // Validate confidence threshold
      if (signal.confidence < 0.7) return null;

      return {
        type: signal.signal_type,
        message: signal.message,
        priority: signal.priority,
        confidence: signal.confidence,
        timestamp: new Date(),
        questionId: this.questionContext?.questionText,
      };
    } catch (error) {
      console.error('Failed to parse coaching signal:', error);
      return null;
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

### Integration in Interview Helper Panel

```typescript
export function InterviewHelperPanel() {
  const { currentQuestion } = useInterviewContext();
  const [coachingSignals, setCoachingSignals] = useState<CoachingSignal[]>([]);
  const [geminiStatus, setGeminiStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const geminiClientRef = useRef<GeminiTextCoachClient | null>(null);

  useEffect(() => {
    // Initialize Gemini client
    geminiClientRef.current = new GeminiTextCoachClient(
      {
        model: 'gemini-2.0-flash-exp',
        mode: 'text-only',
        systemPrompt: COACHING_SYSTEM_PROMPT
      },
      {
        onConnected: () => setGeminiStatus('connected'),
        onSignalDetected: (signal) => {
          setCoachingSignals(prev => [...prev.slice(-2), signal]); // Keep last 3
        },
        onError: (error) => {
          console.error('Gemini error:', error);
          setGeminiStatus('error');
        }
      }
    );

    geminiClientRef.current.connect(sessionId);

    return () => {
      geminiClientRef.current?.disconnect();
    };
  }, [sessionId]);

  // Send question context when AI asks a question
  useEffect(() => {
    if (currentQuestion && geminiClientRef.current) {
      geminiClientRef.current.sendQuestionContext(currentQuestion);
    }
  }, [currentQuestion]);

  return (
    <div className="interview-helper-panel">
      <div className="helper-header">
        <h3>💡 Interview Helper</h3>
        <StatusIndicator status={geminiStatus} />
      </div>

      <div className="coaching-signals">
        {coachingSignals.length === 0 && (
          <EmptyState text="Listening and ready to help..." />
        )}

        {coachingSignals.map((signal, idx) => (
          <CoachingSignalCard
            key={`${signal.timestamp}-${idx}`}
            signal={signal}
            onDismiss={() => dismissSignal(signal)}
          />
        ))}

        {coachingSignals.length > 0 && (
          <button onClick={clearAllSignals}>Clear All</button>
        )}
      </div>

      {geminiStatus === 'error' && (
        <FallbackTips />
      )}
    </div>
  );
}
```

---

## Definition of Done

**Functionality:**

- [ ] Gemini 2.0 Live connection established (text-only mode)
- [ ] Question context sent immediately when AI asks
- [ ] User responses analyzed in real-time or post-speech
- [ ] Coaching signals displayed in helper panel
- [ ] Graceful fallback if Gemini unavailable
- [ ] Interview not affected by Gemini issues

**Code Quality:**

- [ ] `GeminiTextCoachClient` class implemented
- [ ] Clean separation from OpenAI pipeline
- [ ] TypeScript types defined
- [ ] Error handling comprehensive
- [ ] No memory leaks

**Testing:**

- [ ] Unit tests for signal parsing
- [ ] Integration test: question context flow
- [ ] E2E test: complete interview with coaching
- [ ] Latency tests (p50, p95, p99)
- [ ] Error scenario tests (Gemini down, network issues)

**Performance:**

- [ ] P50 latency <700ms
- [ ] P95 latency <1200ms
- [ ] Error rate <1%
- [ ] Zero impact on OpenAI interview latency

**Documentation:**

- [ ] Gemini integration guide
- [ ] Coaching signal taxonomy
- [ ] Prompt engineering notes
- [ ] Troubleshooting guide

---

## Risks & Mitigations

| Risk                             | Impact | Mitigation                                           |
| -------------------------------- | ------ | ---------------------------------------------------- |
| Gemini 2.0 API not stable        | High   | Feature flag to disable; fallback to static tips     |
| Analysis latency too high        | Medium | Use faster Gemini Flash model; batch analysis        |
| Poor signal quality              | Medium | Iterate on system prompt; A/B test different prompts |
| Over-coaching (too many signals) | Low    | Confidence threshold; max 3 signals; auto-dismiss    |

---

**Story Status:** Ready for Development  
**Assigned To:** TBD  
**Sprint:** TBD (Parallel with or after EP3-S12)  
**Last Updated:** 2025-11-04
