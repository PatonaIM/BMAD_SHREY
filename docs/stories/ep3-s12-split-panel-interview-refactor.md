# EP3-S12: Split-Panel Interview Interface Refactor

**Epic:** 3 - Interactive AI Interview System  
**Story ID:** EP3-S12  
**Priority:** High  
**Effort:** 8 Story Points  
**Dependencies:** EP3-S0 (POC), EP3-S4 (Current Implementation)

---

## User Story

**As a** developer maintaining the interview system,  
**I want** a clean split-panel architecture separating AI interview from helper coaching,  
**So that** the codebase is maintainable, debuggable, and extensible for future enhancements.

---

## Context & Motivation

### Current State Problems

1. **Monolithic Component:** 1730-line `InterviewInterface.tsx` mixing multiple concerns
2. **Cognitive Overload:** Managing two realtime AI pipelines in one component
3. **UI Complexity:** Live transcripts, voice selection, dual audio visualization
4. **Debugging Difficulty:** Hard to isolate issues between OpenAI and Gemini flows
5. **Feature Friction:** Adding new features requires navigating massive file

### Desired Future State

- **Left Panel:** AI Interview (ChatGPT Realtime) - pure conversation interface
- **Right Panel:** Interview Helper (Gemini 2.0 Live) - silent text coaching
- **Clear Separation:** Each panel manages its own state and concerns
- **Shared Context:** Question context flows from interviewer to coach
- **Maintainability:** Each component <500 lines, single responsibility

---

## Acceptance Criteria

### 1. Component Architecture

**MUST:**

- [ ] Create `AIInterviewPanel` component (left side)
  - Handles OpenAI Realtime WebSocket connection
  - Displays AI speaking animation
  - Shows current question
  - Manages audio input/output
  - Max 400 lines
- [ ] Create `InterviewHelperPanel` component (right side)
  - Handles Gemini 2.0 Live connection (text mode only)
  - Displays coaching signals
  - Shows analysis text
  - Receives question context from AI panel
  - Max 400 lines
- [ ] Create `InterviewContainer` orchestrator component
  - Manages shared state (session, recording, phase)
  - Coordinates question context flow
  - Handles layout and responsive design
  - Max 300 lines
- [ ] Extract reusable sub-components:
  - `AudioVisualizer` (user mic levels)
  - `AISpeakingAnimation` (AI voice activity)
  - `InterviewStatus` (timer, connection)
  - `InterviewControls` (start/pause/end buttons)

**SHOULD:**

- [ ] Implement context provider for shared interview state
- [ ] Create custom hooks for reusable logic:
  - `useInterviewSession` - session lifecycle
  - `useAudioStream` - audio capture/playback
  - `useQuestionFlow` - question progression
- [ ] Add React.memo optimization for expensive renders

**WON'T (Removed Features):**

- ❌ Live transcript rendering (removed for simplicity)
- ❌ Voice selector UI (use default 'alloy', config via backend)
- ❌ Turn-taking indicator (simpler: AI speaking or not)
- ❌ Latency metrics panel (move to dev tools only)

### 2. Layout & Responsive Design

**Desktop (≥1024px):**

```
┌─────────────────────────────────────────────────┐
│              Interview Session Header            │
│  Status • Timer • Controls                       │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│  AI Interview        │  Interview Helper        │
│  (60% width)         │  (40% width)             │
│                      │                          │
│  🤖 Speaking...      │  💡 Coaching Signals     │
│  ║ ║║ ║ ║║           │                          │
│                      │  ✓ Good structure        │
│  "Tell me about..." │  ⚠ Could be more concise │
│                      │  💬 Consider mentioning  │
│  [Mic Level] ▓▓░░   │     specific metrics     │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

**Tablet (768-1023px):**

- Stack panels vertically
- AI Interview on top (full width)
- Helper panel below (collapsible)

**Mobile (<768px):**

- Single panel view with tab switch
- AI Interview primary
- Helper accessible via floating button

**MUST:**

- [ ] Responsive breakpoints implemented
- [ ] Touch-friendly controls on mobile
- [ ] Accessible keyboard navigation
- [ ] Smooth panel resizing (desktop splitter optional)

### 3. State Management & Data Flow

**Question Context Flow:**

```typescript
// AI Interview Panel asks question
AIInterviewPanel.onQuestionAsked(question: string)
  → InterviewContainer.handleQuestionAsked(question)
  → InterviewHelperPanel.receiveQuestionContext(question)
  → Gemini receives context for analysis
```

**Shared State Structure:**

```typescript
interface InterviewSharedState {
  sessionId: string;
  phase: 'setup' | 'ready' | 'interviewing' | 'ending' | 'complete';
  currentQuestion: {
    id: string;
    text: string;
    category: string;
    askedAt: Date;
  } | null;
  elapsedSeconds: number;
  isRecording: boolean;
  error: string | null;
}
```

**MUST:**

- [ ] Context provider wraps both panels
- [ ] Question context passed in real-time (<100ms latency)
- [ ] Error state shared across panels
- [ ] Recording state coordinated
- [ ] Phase transitions synchronized

### 4. OpenAI Realtime Integration (AI Interview Panel)

**Responsibilities:**

- Manage WebSocket connection to OpenAI Realtime
- Handle audio input from user microphone
- Play AI response audio
- Display AI speaking animation
- Show current question text
- Detect speech activity (VAD)

**Configuration:**

```typescript
{
  model: 'gpt-4o-realtime-preview-2024-10-01',
  voice: 'alloy', // Fixed, no UI selection
  turnDetection: {
    type: 'server_vad',
    threshold: 0.5,
    silence_duration_ms: 800
  },
  inputAudioTranscription: null // No transcript needed
}
```

**Events Handled:**

- `response.audio.delta` → play audio chunks
- `response.audio.done` → stop speaking animation
- `input_audio_buffer.speech_started` → user speaking indicator
- `input_audio_buffer.speech_stopped` → process response
- `session.created` / `session.updated` → connection status

**MUST:**

- [ ] Audio playback smooth (<500ms latency)
- [ ] Speaking animation synced with audio
- [ ] Connection resilience (auto-reconnect)
- [ ] Clear error messages for audio issues
- [ ] Graceful degradation on connection loss

### 5. Gemini 2.0 Live Integration (Helper Panel)

**Responsibilities:**

- Maintain WebSocket to Gemini 2.0 Live API
- Receive question context from AI panel
- Send user response text for analysis (from question context)
- Display coaching signals as text
- Show analysis suggestions
- **NO VOICE OUTPUT** - text mode only

**Configuration:**

```typescript
{
  model: 'gemini-2.0-flash-exp', // or latest 2.0 model
  mode: 'text-only', // No audio generation
  systemPrompt: `You are a silent interview coach. Analyze candidate responses and provide brief, actionable coaching signals. Focus on: structure, clarity, relevance, technical accuracy. Output format: JSON with signal type and brief text.`
}
```

**Analysis Triggers:**

- Receives question text when AI asks
- Analyzes user speech (via audio-to-text from OpenAI OR direct audio stream)
- Emits coaching signals in real-time
- Updates helper panel UI with guidance

**Coaching Signal Types:**

```typescript
type CoachingSignalType =
  | 'structure' // "Consider using STAR format"
  | 'clarity' // "Be more specific about metrics"
  | 'relevance' // "Refocus on the question"
  | 'depth' // "Elaborate on technical details"
  | 'conciseness' // "Summarize key points"
  | 'confidence'; // "Maintain steady pace";

interface CoachingMessage {
  type: CoachingSignalType;
  text: string;
  priority: 'info' | 'suggestion' | 'important';
  timestamp: Date;
}
```

**MUST:**

- [ ] Gemini connection independent of OpenAI
- [ ] Text-only mode enforced (no audio generation)
- [ ] Question context received within 100ms
- [ ] Coaching signals appear within 700ms of speech end
- [ ] Helper panel updates non-blocking (doesn't affect AI interview)
- [ ] Graceful degradation if Gemini unavailable (no coaching, interview continues)

### 6. Removed Features (Scope Reduction)

**Live Transcript:**

- Previously rendered streaming transcript
- **Removed** to reduce complexity
- Transcript still captured for post-interview review
- Rationale: User focuses on speaking, not reading

**Voice Selector:**

- Previously allowed choosing alloy/echo/shimmer
- **Removed** UI component
- Default to 'alloy' voice
- Can be configured via backend if needed later
- Rationale: Reduces setup friction, most users don't care

**Turn-Taking Indicator:**

- Previously showed "AI Speaking" | "Listening" | "User Speaking"
- **Simplified** to just AI speaking animation
- User knows to speak when AI is silent
- Rationale: Over-engineered, natural conversation doesn't need this

**Latency Metrics Panel:**

- Previously visible with keyboard shortcut
- **Moved** to dev tools / debug mode only
- Not visible to end users
- Rationale: Technical metric, not user-facing

---

## Technical Implementation

### File Structure

**Before (Current):**

```
src/components/interview/
  InterviewInterface.tsx (1730 lines) ❌
  VoiceSelector.tsx
  InterviewTranscript.tsx
  TurnTakingIndicator.tsx
  LatencyMetricsPanel.tsx
  ... (other components)
```

**After (New):**

```
src/components/interview/
  InterviewContainer.tsx (main orchestrator ~300 lines)
  panels/
    AIInterviewPanel.tsx (~400 lines)
    InterviewHelperPanel.tsx (~400 lines)
  shared/
    AudioVisualizer.tsx
    AISpeakingAnimation.tsx
    InterviewStatus.tsx
    InterviewControls.tsx
  hooks/
    useInterviewSession.ts
    useAudioStream.ts
    useQuestionFlow.ts
  context/
    InterviewContext.tsx
  types/
    interview.types.ts
```

### Component Hierarchy

```
<InterviewContainer>
  <InterviewContextProvider>
    <InterviewHeader>
      <InterviewStatus />
      <InterviewControls />
    </InterviewHeader>

    <SplitLayout>
      <AIInterviewPanel>
        <AISpeakingAnimation />
        <QuestionDisplay />
        <AudioVisualizer />
      </AIInterviewPanel>

      <InterviewHelperPanel>
        <CoachingSignalDisplay />
        <AnalysisPanel />
      </InterviewHelperPanel>
    </SplitLayout>
  </InterviewContextProvider>
</InterviewContainer>
```

### Custom Hooks Design

**`useInterviewSession`**

```typescript
function useInterviewSession(sessionId: string) {
  // Returns: phase, startInterview, endInterview, elapsedSeconds
  // Handles: session lifecycle, timer, phase transitions
}
```

**`useAudioStream`**

```typescript
function useAudioStream() {
  // Returns: stream, audioLevel, startCapture, stopCapture
  // Handles: getUserMedia, audio processing, cleanup
}
```

**`useQuestionFlow`**

```typescript
function useQuestionFlow(questions: InterviewQuestion[]) {
  // Returns: currentQuestion, nextQuestion, questionHistory
  // Handles: question progression, context tracking
}
```

### Context Provider

```typescript
interface InterviewContextValue {
  // Shared state
  sessionId: string;
  phase: InterviewPhase;
  currentQuestion: QuestionContext | null;
  elapsedSeconds: number;
  isRecording: boolean;
  error: string | null;

  // Actions
  setPhase: (phase: InterviewPhase) => void;
  setCurrentQuestion: (question: QuestionContext) => void;
  setError: (error: string | null) => void;

  // Events
  onQuestionAsked: (question: string) => void;
  onQuestionAnswered: (answer: string) => void;
}
```

---

## Migration Strategy

### Phase 1: Extract Reusable Components (1-2 days)

1. Move `AudioVisualizer` to `shared/`
2. Move `AISpeakingAnimation` to `shared/`
3. Move `InterviewStatus` to `shared/`
4. Move `InterviewControls` to `shared/`
5. Ensure no breaking changes in current `InterviewInterface.tsx`

### Phase 2: Create New Architecture (2-3 days)

1. Create `InterviewContainer.tsx` shell
2. Create `InterviewContext` provider
3. Create custom hooks (`useInterviewSession`, `useAudioStream`, `useQuestionFlow`)
4. Create `AIInterviewPanel.tsx` (migrate OpenAI logic)
5. Create `InterviewHelperPanel.tsx` (migrate Gemini logic)

### Phase 3: Wire Everything Together (1-2 days)

1. Connect context provider to panels
2. Implement question context flow
3. Test OpenAI audio pipeline
4. Test Gemini coaching pipeline
5. Implement responsive layout

### Phase 4: Feature Removal & Cleanup (1 day)

1. Remove `InterviewTranscript` component usage
2. Remove `VoiceSelector` component
3. Remove `TurnTakingIndicator` component
4. Remove `LatencyMetricsPanel` from UI (keep in dev tools)
5. Clean up unused state and handlers

### Phase 5: Testing & Refinement (1-2 days)

1. End-to-end interview flow testing
2. Responsive design testing (mobile, tablet, desktop)
3. Audio quality validation
4. Coaching signal timing verification
5. Error handling and edge cases
6. Performance profiling

### Phase 6: Deprecate Old Component (1 day)

1. Rename `InterviewInterface.tsx` → `InterviewInterface.legacy.tsx`
2. Update route to use new `InterviewContainer`
3. Monitor production for issues
4. Remove legacy file after 1 sprint

---

## Definition of Done

**Code Quality:**

- [ ] All new components <500 lines
- [ ] TypeScript strict mode passing
- [ ] ESLint warnings resolved
- [ ] No console.log statements (use structured logging)
- [ ] Proper error boundaries implemented

**Functionality:**

- [ ] AI interview audio working (OpenAI Realtime)
- [ ] Coaching signals appearing (Gemini text mode)
- [ ] Question context flowing correctly
- [ ] Recording captured (preparation for EP3-S13)
- [ ] Error handling graceful
- [ ] Responsive layout working

**Testing:**

- [ ] Unit tests for custom hooks (≥80% coverage)
- [ ] Integration tests for panel communication
- [ ] E2E test for complete interview flow
- [ ] Manual testing on 3 browsers (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS, Android)

**Documentation:**

- [ ] Component README with usage examples
- [ ] Hook documentation with TypeScript types
- [ ] Architecture diagram updated
- [ ] Migration guide for future developers

**Performance:**

- [ ] Audio latency <500ms
- [ ] Coaching signal latency <700ms
- [ ] Question context propagation <100ms
- [ ] Component render time <16ms (60fps)
- [ ] Memory stable over 30-min interview

---

## Risks & Mitigations

| Risk                                         | Impact | Mitigation                                                              |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Audio quality degradation during refactor    | High   | Test audio pipeline in isolation first; keep old component as fallback  |
| Question context not reaching Gemini in time | Medium | Add retry logic; queue contexts; measure latency                        |
| Responsive layout breaks on edge cases       | Medium | Comprehensive device testing; use CSS Grid for robustness               |
| Gemini 2.0 API not stable yet                | High   | Feature flag to disable helper panel; interview works without it        |
| Too many re-renders causing lag              | Medium | Implement React.memo, useMemo, useCallback; profile with React DevTools |

---

## Success Metrics

- **Maintainability:** Average component size reduced from 1730 to <500 lines
- **Developer Velocity:** New features take 30% less time to implement
- **Bug Isolation:** Time to identify issue reduced by 50%
- **Performance:** No measurable latency increase from refactor
- **User Experience:** Interview completion rate maintained or improved

---

## Future Enhancements (Post-Refactor)

Once split-panel architecture is stable:

- EP3-S13: Canvas recording for root component capture
- EP3-S14: Enhanced Gemini coaching with better context
- EP3-S15: Resumable interviews (save/restore state)
- EP3-S16: Multi-language interview support
- EP3-S17: Interviewer personality customization

---

## Notes & Assumptions

- OpenAI Realtime API remains stable (no breaking changes)
- Gemini 2.0 Live supports text-only mode via API config
- Current audio infrastructure (WebRTC, AudioContext) is solid
- Recording manager works independently of UI layout
- Question context can be extracted from OpenAI events

---

**Story Status:** Ready for Development  
**Assigned To:** TBD  
**Sprint:** TBD  
**Last Updated:** 2025-11-04
