# EP5 API & Data Contracts (Realtime Interview Page)

Date: 2025-11-05  
Version: 0.1 (Draft)

## Overview

Defines the data models, validation schemas, and HTTP/tRPC API surface for the greenfield realtime interview page (Epic 5). Focus: minimal, explicit contracts with forward compatibility (versioning & audit).

## Guiding Principles

- Idempotent mutations where feasible (start, finalize)
- Ephemeral tokens never persisted beyond session scope
- Separation of realtime (WebSocket) vs control (HTTP/tRPC) plane
- Hash / reference store for sensitive context excerpts (no raw resume/job text duplication)

## Data Models (Canonical TypeScript)

```ts
// Version tagging for forward evolution
export interface InterviewSessionV2 {
  version: 2;
  sessionId: string; // UUID
  applicationId: string;
  userId: string;
  jobId: string;
  status: 'initializing' | 'active' | 'finalizing' | 'completed' | 'error';
  startedAt: string; // ISO
  endedAt?: string; // ISO
  durationSec?: number;
  adaptiveConfig: {
    maxMinutes: number; // 10-15
    targetDomains: { domain: DomainType; min: number }[];
  };
  recording: {
    composite: boolean;
    resolution: string; // e.g. 1280x720
    mimeType: 'video/webm';
    chunkCount: number;
    totalSizeBytes?: number;
    manifestBlobUrl?: string; // signed URL after finalize
  };
  technicalWeightProfileId?: string;
  scoreReportId?: string;
  metrics?: {
    avgQuestionLatencyMs?: number;
    reconnectAttempts: number;
    uploadRetryCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

type DomainType =
  | 'technical'
  | 'behavioral'
  | 'communication'
  | 'architecture'
  | 'problem_solving';

export interface QuestionEventV2 {
  id: string; // UUID
  sessionId: string;
  idx: number; // sequential index
  askedAt: string; // ISO
  answeredAt?: string; // ISO
  domain: DomainType;
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  questionText: string;
  contextFragmentIds: string[]; // hashed excerpt refs
  evaluation?: {
    clarity: number; // 0-1
    correctness: number; // 0-1
    depth: number; // 0-1
    confidence: number; // 0-1
  };
  answerSummaryHash?: string; // hash of normalized summary
  createdAt: string;
}

export interface ChunkUploadMetaV2 {
  sessionId: string;
  chunkIndex: number;
  byteLength: number;
  sha256: string;
  receivedAt: string; // ISO
}

export interface RecordingManifestV2 {
  version: 1;
  sessionId: string;
  resolution: string;
  mimeType: 'video/webm';
  composite: boolean;
  chunks: { i: number; size: number; sha: string }[];
  totalSize: number;
  fpsAvg?: number;
  createdAt: string;
}

export interface ScoreReportV2 {
  id: string;
  sessionId: string;
  baseScore: number; // 0-100
  technicalScore: number;
  communicationScore: number;
  adaptabilityScore?: number;
  weightedFinal: number; // 0-100 after role weighting
  boostApplied: number; // delta to application
  domainBreakdown: Record<string, number>;
  difficultyProgression: number[]; // tiers sequence
  calculationVersion: string; // e.g. 'v2.0'
  generatedAt: string;
}

export interface TechnicalWeightProfileV2 {
  id: string;
  roleCategories: string[]; // taxonomy keys
  multipliers: { technical: number; communication: number; depth: number };
  version: number;
  updatedAt: string;
}
```

## Validation (Zod Sketch)

```ts
import { z } from 'zod';

export const domainTypeSchema = z.enum([
  'technical',
  'behavioral',
  'communication',
  'architecture',
  'problem_solving',
]);

export const adaptiveConfigSchema = z.object({
  maxMinutes: z.number().int().min(5).max(20),
  targetDomains: z.array(
    z.object({ domain: domainTypeSchema, min: z.number().int().min(0).max(10) })
  ),
});

export const startSessionInputSchema = z.object({
  applicationId: z.string().uuid(),
  jobId: z.string().uuid(),
  maxMinutes: z.number().int().min(10).max(15).default(15),
});

export const issueRealtimeTokenInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export const uploadChunkInputSchema = z.object({
  sessionId: z.string().uuid(),
  chunkIndex: z.number().int().min(0),
  sha256: z.string().length(64),
  byteLength: z.number().int().min(1),
  // binary chunk handled separately (FormData or base64 in tRPC streaming)
});

export const finalizeRecordingInputSchema = z.object({
  sessionId: z.string().uuid(),
});

export const questionEvaluationSchema = z.object({
  clarity: z.number().min(0).max(1),
  correctness: z.number().min(0).max(1),
  depth: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export const pushQuestionEventSchema = z.object({
  sessionId: z.string().uuid(),
  idx: z.number().int().min(0),
  domain: domainTypeSchema,
  difficultyTier: z.number().int().min(1).max(5),
  questionText: z.string().min(5).max(800),
  contextFragmentIds: z.array(z.string().length(40)), // e.g. SHA1 truncated or custom hash
});

export const updateQuestionEvaluationSchema = z.object({
  sessionId: z.string().uuid(),
  id: z.string().uuid(),
  evaluation: questionEvaluationSchema,
  answerSummaryHash: z.string().length(64).optional(),
});

export const requestScoreReportSchema = z.object({
  sessionId: z.string().uuid(),
});
```

## API Surface (tRPC Style)

| Procedure                              | Type     | Input Schema                      | Description                                             | Auth                             | Idempotent                                       |
| -------------------------------------- | -------- | --------------------------------- | ------------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| `interviewV2.startSession`             | mutation | `startSessionInputSchema`         | Create `InterviewSessionV2` record and return sessionId | Candidate                        | Yes (returns existing if active for application) |
| `interviewV2.issueRealtimeToken`       | mutation | `issueRealtimeTokenInputSchema`   | Returns ephemeral OpenAI token + expiry                 | Candidate                        | No (each call new token)                         |
| `interviewV2.uploadChunk`              | mutation | `uploadChunkInputSchema` + binary | Stores chunk & returns ack                              | Candidate                        | Yes (same index + hash returns success)          |
| `interviewV2.finalizeRecording`        | mutation | `finalizeRecordingInputSchema`    | Validates sequence, writes manifest, updates session    | Candidate                        | Yes                                              |
| `interviewV2.pushQuestionEvent`        | mutation | `pushQuestionEventSchema`         | Persist asked question event                            | Candidate                        | Yes (idempotent on (sessionId, idx))             |
| `interviewV2.updateQuestionEvaluation` | mutation | `updateQuestionEvaluationSchema`  | Store evaluation metrics                                | Candidate                        | Yes (overwrites)                                 |
| `interviewV2.requestScoreReport`       | mutation | `requestScoreReportSchema`        | Triggers scoring if not done                            | Candidate                        | Yes                                              |
| `interviewV2.getSession`               | query    | `{ sessionId }`                   | Fetch session with status & metrics                     | Candidate                        | N/A                                              |
| `interviewV2.getScoreReport`           | query    | `{ sessionId }`                   | Fetch computed score report                             | Candidate/Recruiter (role gated) | N/A                                              |
| `interviewV2.getTechnicalProfile`      | query    | `{ roleKey }`                     | Get technical weighting profile                         | Internal/Candidate (read)        | N/A                                              |

## Realtime WebSocket Events (Interview Control Plane)

| Event               | Direction     | Payload                                       | Notes                             |
| ------------------- | ------------- | --------------------------------------------- | --------------------------------- | ------------------------------- |
| `rt.session.init`   | Client→Server | { sessionId, token }                          | Authenticate realtime stream      |
| `rt.audio.delta`    | Client→Server | PCM16 frame (binary)                          | Sequenced via internal header     |
| `rt.turn.start`     | Server→Client | { role: 'ai'                                  | 'candidate' }                     | Derived from VAD / server logic |
| `rt.question.ready` | Server→Client | { idx, questionText, domain, difficultyTier } | Drives UI display                 |
| `rt.ai.audio.delta` | Server→Client | PCM16 chunk                                   | AI voice playback stream          |
| `rt.ai.audio.done`  | Server→Client | { idx }                                       | Marks end-of-question audio       |
| `rt.error`          | Server→Client | { code, message }                             | Align codes with INT\_\* taxonomy |
| `rt.session.end`    | Server→Client | { reason }                                    | Triggers finalize flow            |

## Security & Auth Notes

- All procedures require authenticated candidate session; recruiter allowed only on `getScoreReport` (future) with role check.
- Upload chunk path authorization: verify session owned by user & status is `active` or `finalizing`.
- Rate limits (suggested):
  - `issueRealtimeToken`: max 5 / 10 minutes per session
  - `uploadChunk`: sliding window (e.g. ≤30 requests / 10s) to prevent abuse

## Error Codes (Interview V2 Prefix)

| Code                            | Meaning                             | Remediation                                |
| ------------------------------- | ----------------------------------- | ------------------------------------------ |
| `INT_V2_TOKEN_EXPIRED`          | Provided realtime token expired     | Request new token                          |
| `INT_V2_BAD_CHUNK_ORDER`        | Non-sequential chunk index          | Re-send correct index; abort if persistent |
| `INT_V2_HASH_MISMATCH`          | Chunk hash invalid                  | Retry upload; potential corruption         |
| `INT_V2_SESSION_NOT_ACTIVE`     | Operation on inactive session state | Refresh session state or restart           |
| `INT_V2_SCORE_ALREADY_COMPLETE` | Duplicate scoring request           | Use getScoreReport                         |
| `INT_V2_PROFILE_NOT_FOUND`      | Technical weighting profile missing | Falls back to default multipliers          |

## Idempotency Keys

- `startSession`: (userId, applicationId) composite unique constraint ensures only one active session.
- `pushQuestionEvent`: uniqueness on (sessionId, idx).
- `uploadChunk`: combination (sessionId, chunkIndex, sha256) defines idempotent repeat.

## Concurrency Considerations

- Reject second `startSession` while first is `active`.
- Prevent chunk uploads after `finalizeRecording` begins (status guard).
- Scoring job uses lock (sessionId) to avoid duplicate computation.

## Example Flow (Sequence)

```
1. startSession → sessionId
2. issueRealtimeToken → token
3. WebSocket handshake (rt.session.init)
4. Audio streaming + adaptive loop
5. pushQuestionEvent for each asked question
6. updateQuestionEvaluation after each answer evaluation pass
7. uploadChunk events in parallel during interview
8. finalizeRecording after end
9. requestScoreReport (async compute)
10. getScoreReport polling until available
```

## Monitoring Hooks

Emit structured logs for:

- `session_start`, `question_generated`, `chunk_uploaded`, `chunk_retry`, `session_finalize`, `scoring_complete`
  Fields: `event`, `session_id`, `application_id`, `duration_ms` (when relevant), `status`, `retry_count`.

## Future Extensions

- Streaming transcript events (`rt.transcript.delta`)
- Recruiter observer channel (`rt.observer.join` / `rt.observer.leave`)
- Multi-participant sessions (additional candidate peer connections)

## Open Items (To Clarify)

| Item                        | Pending Decision                                     |
| --------------------------- | ---------------------------------------------------- |
| Binary chunk transport      | tRPC file upload vs REST multipart vs direct SAS PUT |
| Evaluation source           | Client-side heuristic vs server LLM pass             |
| Resume/job fragment hashing | Hash algorithm + truncation length                   |

---

Prepared by Winston (Architect)
