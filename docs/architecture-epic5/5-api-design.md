# 5. API Design (tRPC Stage Operations)

## Design Principles

1. Server-side action derivation — client requests available actions, never computes permissions.
2. Explicit error taxonomy — distinguish `InvalidTransitionError`, `MaxStagesError`, `DisqualifiedError`, `FeatureFlagDisabledError`.
3. Idempotent writes where feasible (duplicate create guarded via hash of (applicationId,type,order?) when necessary).
4. Thin procedures delegate to StageService; repository has zero business rules.

## Namespacing

Routers segmented by role context:

- `recruiterStageRouter`
- `candidateStageRouter`
- Shared read-only queries in `applicationStageRouter`

## Procedure Catalog

| Procedure                  | Router           | Method   | Returns                               | Notes                                        |
| -------------------------- | ---------------- | -------- | ------------------------------------- | -------------------------------------------- |
| `getStages`                | applicationStage | query    | `ApplicationStage[]`                  | Role passed in ctx → filtered visibility     |
| `getActiveStage`           | applicationStage | query    | `ApplicationStage`                    | 404 if none                                  |
| `createStage`              | recruiterStage   | mutation | `ApplicationStage`                    | Validates multiplicity & ordering            |
| `updateStageStatus`        | recruiterStage   | mutation | `void`                                | Validates lifecycle rule                     |
| `addStageData`             | recruiterStage   | mutation | `void`                                | Partial merge with per-type sanitizer        |
| `reorderStages`            | recruiterStage   | mutation | `ApplicationStage[]`                  | Enforces invariants                          |
| `cancelStage`              | recruiterStage   | mutation | `void`                                | Sets status `skipped` if pending/in_progress |
| `getAvailableActions`      | applicationStage | query    | `Action[]`                            | Derived candidate or recruiter action models |
| `uploadAssignmentAnswer`   | candidateStage   | mutation | `void`                                | Stage status flip to `awaiting_recruiter`    |
| `submitAssignmentFeedback` | recruiterStage   | mutation | `void`                                | Stage → `completed`                          |
| `scheduleInterview`        | recruiterStage   | mutation | `{ stageId, meetLink }`               | Creates stage + scheduledCall                |
| `requestReschedule`        | candidateStage   | mutation | `void`                                | Embeds reschedule request object             |
| `submitInterviewFeedback`  | recruiterStage   | mutation | `void`                                | Stage → `completed`                          |
| `sendOffer`                | recruiterStage   | mutation | `{ stageId }`                         | Creates offer stage                          |
| `respondToOffer`           | candidateStage   | mutation | `void`                                | Accept → create `offer_accepted` stage       |
| `revokeOffer`              | recruiterStage   | mutation | `void`                                | Offer → `skipped` + disqualify application   |
| `uploadOnboardingDocument` | candidateStage   | mutation | `{ documents: OnboardingDocument[] }` | Pushes doc entry                             |
| `disqualifyApplication`    | recruiterStage   | mutation | `void`                                | Sets `isDisqualified` & terminates journey   |

## Error Taxonomy

```typescript
class InvalidTransitionError extends Error {
  code = 'INVALID_TRANSITION';
}
class MaxStagesError extends Error {
  code = 'MAX_STAGES_EXCEEDED';
}
class DisqualifiedError extends Error {
  code = 'APPLICATION_DISQUALIFIED';
}
class FeatureFlagDisabledError extends Error {
  code = 'FEATURE_DISABLED';
}
```

Returned via tRPC error formatter mapping to HTTP-like codes (400 / 403 / 409).

## Validation Strategy

- Input schemas via Zod.
- Transition validation central in `StageService.validateStageTransition(stage, newStatus)`.
- Data mergers sanitize against type-specific allowed keys.

## Action Derivation Example

```typescript
function deriveCandidateActions(stage: ApplicationStage): CandidateAction[] {
  if (stage.status === 'pending' && stage.type === 'assignment') {
    return [
      {
        id: 'upload',
        type: 'upload_assignment',
        label: 'Upload Answer',
        enabled: true,
      },
    ];
  }
  // ... other branches
  return [];
}
```

## Performance Considerations

- Bundle stage queries into single `getApplicationStages(applicationId)` call for initial render; subsequent granular queries allowed but not default.
- Avoid N+1 by embedding minimal polymorphic data directly in stage documents (no separate assignment collection).

## Rate Limiting

| Procedure              | Policy                      |
| ---------------------- | --------------------------- |
| createStage            | 10 per application per hour |
| updateStageStatus      | 60 per application per hour |
| uploadAssignmentAnswer | 5 per assignment stage      |

## Observability

Emit structured logs for each mutation:

```json
{
  "component": "StageService",
  "operation": "updateStageStatus",
  "stageId": "...",
  "from": "in_progress",
  "to": "awaiting_recruiter",
  "actorRole": "candidate",
  "latencyMs": 132
}
```

Metrics exported: transition success rate, error counts by code, latency histograms.

## Security Hooks

- Role injected into ctx → early rejection before service call.
- Visibility filtering executed server-side; candidate never receives hidden recruiter-only stage data.

## Backward Compatibility

While legacy consumers may still read `status`, new routers do not expose it except via transitional debug endpoint `getLegacyStatus` (optional, time-boxed).
