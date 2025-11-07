# Epic 5: Realtime Interview Page (Greenfield Implementation)

Date: 2025-11-05  
Status: Planned (Initiation)  
Owner: Interview Feature Squad (Architect: Winston)

## Epic Goal

Deliver a brand-new, self-contained **Realtime Interview Page** that does NOT reuse existing legacy interview components, enabling a clean architecture focused on:

- Immediate camera/microphone permission acquisition
- Adaptive, AI-driven questioning (no full pre-generation) using job + resume context
- OpenAI Realtime model via WebRTC + WebSocket bridging
- Canvas-based composite recording (UI + webcam PiP + mixed audio: candidate & AI)
- Chunked resilient upload of recording to Azure Blob Storage
- Post-session scoring & technical weighting enhancements
- Future extensibility (multi-interviewer, recruiter live view, localization)

## Out of Scope (Explicit)

- Legacy component reuse or refactor (Epic 3 covers that)
- Gemini coaching integration (may appear later as enhancement)
- Recruiter review UI (future epic)
- Avatar / lip-sync features

## Success Metrics

| Metric                                           | Target                                  |
| ------------------------------------------------ | --------------------------------------- |
| Permission acquisition success                   | >98% (supported browsers)               |
| AI question latency (first audio delta)          | <1200ms p50                             |
| End-to-end audio latency                         | <550ms p50                              |
| Recording continuity (no gaps >1s)               | 99% sessions                            |
| Chunk upload failure retries resolved            | 100% within 3 attempts                  |
| Scoring turnaround time                          | <20s post-interview                     |
| Technical weighting accuracy (manual validation) | ≥85% alignment with reviewer assessment |

## High-Level Flow

1. User opens Interview Page route (`/interview/new/:applicationId`)
2. Permission gate: request camera+mic; show diagnostics & fallback guidance
3. Secure token exchange: ephemeral OpenAI realtime session token + short-lived upload SAS token
4. Start session → AI greets using system prompt (masked, contextual)
5. Dynamic question loop: generate next question just-in-time using last answer, job description, resume vectors
6. Record entire viewport via Canvas compositor + mixed audio stream
7. Stream & buffer recording chunks; enqueue Azure upload (backpressure aware)
8. Interview ends (time cap 10–15 min or coverage satisfied) → finalize all remaining chunks
9. Scoring engine runs: base competency + communication + technical weighting + difficulty progression
10. Persist `InterviewSession`, `QuestionEvents`, `ScoreReport`; update `Application` (boost calculation)
11. Page transitions to summary panel with provisional score & processing states

## Architecture Slice (New)

| Layer   | Component / Service         | Purpose                                 |
| ------- | --------------------------- | --------------------------------------- |
| UI      | `NewInterviewPage`          | Entry, permission + loading             |
| UI      | `RealtimeInterviewShell`    | Layout, timer, status, controls         |
| UI      | `DynamicQuestionPresenter`  | Shows current AI question & metadata    |
| UI      | `AudioLevelIndicator`       | Candidate mic visualization             |
| UI      | `AISpeakingPulse`           | AI speech visual cue                    |
| UI      | `RecordingStatusBar`        | Chunking + upload progress              |
| Service | `RealtimeAudioBridge`       | Mic → PCM16 → WebSocket stream          |
| Service | `OpenAIRealtimeClient`      | Session mgmt, events, reconnection      |
| Service | `ContextAssembler`          | Merge job + resume + prior answers      |
| Service | `AdaptiveQuestionEngine`    | Just-in-time question selection         |
| Service | `CanvasCompositeRecorder`   | DOM + video + PiP webcam capture        |
| Service | `ChunkUploadManager`        | Blob slicing, retry, SAS renew          |
| Service | `ScoringEngineV2`           | Post-interview scoring & weighting      |
| Service | `TechnicalWeightResolver`   | Role-based technical emphasis           |
| Service | `SessionStateStore`         | In-memory state machine (finite states) |
| Service | `SecurityTokenService`      | Issue ephemeral tokens (OpenAI, Azure)  |
| Infra   | `AzureBlobInterviewAdapter` | Write + finalize + metadata tagging     |

## Data Model Additions (Draft)

```ts
interface InterviewSessionV2 {
  sessionId: string;
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'initializing' | 'active' | 'finalizing' | 'completed' | 'error';
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  recording: {
    blobContainerPath: string; // path prefix
    chunkCount: number;
    mimeType: 'video/webm';
    composite: true; // canvas-based
    resolution: string; // e.g. '1280x720'
    totalSizeBytes?: number;
  };
  technicalWeightProfileId?: string;
  scoreReportId?: string;
  adaptiveConfig: {
    maxMinutes: number; // 10–15
    targetDomains: DomainQuota[]; // e.g. technical >=3
  };
  metrics?: {
    avgQuestionLatencyMs?: number;
    reconnectAttempts: number;
    uploadRetryCount: number;
  };
}

interface QuestionEventV2 {
  id: string;
  sessionId: string;
  index: number;
  askedAt: Date;
  answeredAt?: Date;
  domain:
    | 'technical'
    | 'behavioral'
    | 'communication'
    | 'architecture'
    | 'problem_solving';
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  questionText: string;
  generatedContextFragments: string[]; // snippets used
  evaluation?: {
    clarity: number; // 0–1
    correctness: number; // 0–1
    depth: number; // 0–1
    confidence: number; // 0–1
  };
}

interface ScoreReportV2 {
  id: string;
  sessionId: string;
  baseScore: number; // 0–100
  technicalScore: number;
  communicationScore: number;
  adaptabilityScore?: number;
  weightedFinal: number; // after role weighting
  boostApplied: number; // delta added to application
  domainBreakdown: Record<string, number>;
  difficultyProgression: number[]; // tiers sequence
  generatedAt: Date;
}
```

## Key Non-Functional Requirements

- Resilient against transient network loss (auto-reconnect ≤3 attempts)
- Token refresh without user interruption (silent handoff)
- Backpressure on upload queue (pause recording if memory > threshold? Prefer streaming flush)
- Privacy: no raw resume text stored in question events—store references / hashed fragments
- Security: ephemeral tokens expire ≤ 3 minutes if unused

## Open Questions / Assumptions

| Topic                | Assumption (to validate)                                     |
| -------------------- | ------------------------------------------------------------ |
| Resume Source        | Candidate profile already normalized & embedded              |
| Job Description Size | Pre-truncated snippet ≤ 2000 chars for prompt efficiency     |
| Browser Support      | Target Chromium + Firefox first; Safari graceful degradation |
| Recording Format     | Use VP9+Opus WebM; transcode later if recruiter requires MP4 |
| Scoring Sync         | Scoring runs async; summary page polls until READY           |

## Initial Story Set

See individual `ep5-sX-*` files (S1–S13).

## Risks & Mitigations

| Risk                           | Mitigation                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| Latency spikes                 | Pre-warm session, minimal prompt, measure round-trip metrics |
| Chunk upload failures          | Exponential backoff + integrity hash per chunk               |
| Overly generic questions       | Adaptive engine includes answer-derived semantic gaps        |
| Tech role mis-weighting        | Calibrate with seed dataset & manual review cycle            |
| Canvas perf on low-end devices | Dynamic resolution downgrade (1280→960→640)                  |

## Definition of Done (Epic)

- All S1–S12 stories completed & validated
- Recording file accessible + playable end-to-end for 3 test sessions
- Scoring engine produces consistent weighted final score
- Application record updated with boost & reference to new session
- Architecture doc appendix updated with Interview Page section

## Future Extensions (Preview)

- Multi-interviewer (panel simulation)
- Live recruiter join (observer WebRTC merge)
- Localization of interviewer language & cultural hints
- Sentiment & engagement timeline overlays

---

Prepared by Winston (Architect) • 2025-11-05
