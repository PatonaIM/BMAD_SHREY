# EP5 User Journey Updates (Realtime Interview Flow Enhancements)

## Additions

1. Manual Start: After device permissions succeed the user clicks a Start Interview button. Only then do we request an ephemeral token and begin WebRTC negotiation.
2. AI Greeting & Introduction: Once connection reaches `phase=connected` we send `client.start` (manual trigger) and AI greets the candidate (`interview.greet`), requesting an introduction (interviewPhase becomes `intro`).
3. Conducting Phase: Upon first `question.ready` after greeting, interviewPhase moves to `conducting` and adaptive question flow proceeds.
4. Explicit Scoring: User can end the interview by clicking "End & Score Interview" which emits `client.request_score`. When the AI returns `interview.score` the interviewPhase becomes `completed` and `finalScore` (0..100) is displayed. A local fallback generates a placeholder score if the remote score event is not received within 8s.

## New Session State Fields

Extended `RealtimeSessionState`:

- `interviewPhase`: `'pre_start' | 'intro' | 'conducting' | 'scoring' | 'completed'`
- `finalScore?: number` — present after completion.

## New DataChannel Event Types

Added to `InterviewRTCEvent.type` union:

- `interview.greet` — AI greeting & intro request.
- `interview.score` — AI produced final score.
- `interview.done` — explicit completion fallback.

## Client Control Events

Client now sends:

- `client.start` — initiate interview (greet).
- `client.request_score` — request scoring & completion.

## UI Changes (`RealtimeSessionBootstrap.tsx`)

- Displays Start Interview button after permissions (phase still `idle`).
- Initiates handshake and recorder only after user click.
- Sends `client.start` automatically after connection if still `pre_start`.
- Shows status messages for greeting, conducting, scoring phases.
- Displays final score once completed.

## Helpers

Two helper functions exported:

- `sendInterviewStart(controlChannel)`
- `requestInterviewScore(controlChannel)`

## Fallback Behavior

If no `interview.score` event is received within 8 seconds of requesting score, a placeholder (pseudo-random 60–100) score is generated to unblock UI. This is clearly distinguishable and can be replaced by real scoring integration later.

## Next Steps (Future Work)

- Replace placeholder local score with aggregated evaluation metrics from answer analysis pipeline.
- Server-side enforcement of interview length & scoring algorithm.
- Persist final score + artifacts (recording metadata, answer evaluations) to storage.
- Integrate context assembler fragments to inform dynamic question generation during `conducting` phase.

---

## Acceptance Criteria (Draft, Manual Start Revision)

1. After permissions, user sees Start Interview button (phase `idle`, interviewPhase `pre_start`).
2. Clicking Start Interview triggers token fetch + SDP offer/answer (phases progress `idle` → `token` → `connecting` → `connected`).
3. Upon `connected`, client sends `client.start` (only if still `pre_start`).
4. Reception of `interview.greet` (or synthetic fallback) sets interviewPhase `intro`.
5. First `question.ready` after Intro moves interviewPhase to `conducting`.
6. CompositeRecorder starts immediately upon user click and stops when interviewPhase enters `scoring` or `completed`.
7. End & Score button visible only in Conducting phase.
8. Clicking End & Score sends `client.request_score` → interviewPhase `scoring`.
9. Reception of `interview.score` sets finalScore and interviewPhase `completed`.
10. Fallback pseudo score after 8s if no remote score; interviewPhase `completed`.
11. All transitions reflected in `RealtimeSessionState` without page reload; no console errors.

## Event Contract

### Client → AI (Control Channel)

```json
{ "type": "client.start", "ts": 1730820000000, "payload": {} }
{ "type": "client.request_score", "ts": 1730820050000, "payload": {} }
```

### AI / Server → Client (Control Channel)

```jsonc
{ "type": "interview.greet", "ts": 1730820001200, "payload": { "message": "Hello, please introduce yourself." } }
{ "type": "question.ready", "ts": 1730820010000, "payload": { "idx": 0, "topic": "system design" } }
{ "type": "ai.state", "ts": 1730820010500, "payload": { "speaking": true } }
{ "type": "interview.score", "ts": 1730820105000, "payload": { "score": 82, "breakdown": { "clarity": 0.78, "correctness": 0.85, "depth": 0.70 } } }
{ "type": "interview.done", "ts": 1730820106000, "payload": {} }
```

Notes:

- `breakdown` aligns with `AnswerEvaluation` dimensions; scaling to 0–1 server side then converted to percentage UI if needed.
- `question.ready.payload.idx` monotonic strictly increasing (0-based).

## State Transition Narrative

```text
permissions_ready + pre_start --> (user clicks Start Interview) --> token --> connecting --> connected
connected + pre_start --(client.start sent)--> intro
intro --(interview.greet)--> intro (idempotent)
intro --(first question.ready)--> conducting
conducting --(user clicks End & Score)--> scoring
scoring --(interview.score)--> completed
scoring --(timeout 8s)--> completed (fallback score)
```

## Integration Hooks

- When in `conducting`, every `question.ready` should trigger invocation of context assembler: `assembleContext({ answers, job, currentDifficultyTier, maxTokens })` and feed fragments into prompt generation.
- Scoring integration (future): Use accumulated `AnswerEvaluation` objects to compute final score instead of fallback randomness; produce `interview.score` event.
- Recording: `CompositeRecorder` now starts immediately after user clicks Start Interview (captures intro). Stops automatically when scoring begins or interview completes.

## UI Responsibilities (`RealtimeSessionBootstrap.tsx`)

- Derive Start button visibility from `permissions_ready` flag while phase `idle` & interviewPhase `pre_start`.
- Display stable metrics (latency, jitter) irrespective of interviewPhase.
- Disable End & Score button after click, until scored or timeout.
- Show final score with label "Final Score" (no extra actions enabled).

## Test Plan (High-Level)

1. Phase Rendering: Mock state transitions and assert correct buttons/messages appear/disappear.
2. Event Handling: Simulate DataChannel messages for greet, question.ready, score; verify state updates.
3. Fallback Score: Trigger scoring request then advance timers without score event; expect finalScore populated and phase completed.
4. Idempotent Intro: Dispatch multiple `interview.greet`; ensure no duplicate side effects (e.g., score reset).
5. Conducting Exit: After scoring begins, further `question.ready` events should not revert phase.

## Open Questions

- Should scoring allow partial categories (e.g., if depth insufficient) and display structured rubric? (Future spec)
- Do we need a distinct `review` phase post scoring for feedback explanation? (Potential EP5-Sx story)

## Risks & Mitigations

| Risk                              | Impact                      | Mitigation                                                                        |
| --------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Missing score event               | User stuck in scoring       | Fallback timeout pseudo score + telemetry                                         |
| DataChannel congestion            | Delayed phase change        | Lightweight JSON, avoid large payloads on control channel                         |
| Clock skew between client/server  | Incorrect latency reasoning | Use server authoritative timestamps only for analytics, client for UI transitions |
| Race: question.ready before greet | Phase mis-order             | Guard: only transition to conducting after intro detected                         |

## Telemetry (Future)

- Emit metrics: time_to_intro, time_conducting_duration, questions_count, score_final.
- Error events: missing_score_timeout, unexpected_phase_transition.

## Tasks

- [x] Extend `RealtimeSessionState` with interviewPhase & finalScore.
- [x] Add DataChannel event types (greet, score, done) & client control events.
- [x] Reintroduce manual Start Interview button & defer handshake until click.
- [x] Start CompositeRecorder on manual start.
- [x] Implement End & Score button with fallback scoring.
- [x] Refactor event handling into pure `applyInterviewRTCEvent`.
- [x] Add unit tests for journey transitions.
- [x] Integrate context assembler invocation on each conducting `question.ready`.
- [ ] Replace fallback score with real aggregation logic.
- [ ] Persist final interview artifacts (score, metadata, recording).

## Dev Agent Record

### File List

- `src/services/interview/realtimeInterview.ts` (state & events updated, helper added)
- `src/components/interview/v2/RealtimeSessionBootstrap.tsx` (journey UI controls)
- `src/tests/realtimeInterviewJourney.test.ts` (phase transition tests)
- `docs/stories/ep5-user-journey-updates.md` (this story doc updated)

### Change Log

- Introduced interview journey phases and scoring flow.
- Added pure state transition function for testing.
- Added tests validating greet → conducting → completed sequence.

### Debug Log References

None encountered; no runtime errors reproduced locally.

### Completion Notes

- Core journey mechanics implemented and tested.
- Fallback scoring ensures UX doesn’t stall.

### Status

In Progress
