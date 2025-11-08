# 6. External Service Integration

## Overview

Epic 5 reuses and extends external integrations established in Epic 4, ensuring consistency and minimizing new surface area. Focus is on linking stage data to existing resources rather than inventing parallel systems.

## Google Calendar (Live Interviews)

| Aspect             | Approach                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Event Creation     | `scheduleInterview` invokes GoogleCalendarService.createEvent                             |
| Slot Selection     | Candidate picks recruiter availability slot (existing slot model)                         |
| Reschedule Request | Stored inside stage `data.rescheduleRequested` pending recruiter adjudication             |
| Status Sync        | Stage status mirrors scheduledCall status (completed / cancelled) via listener or polling |

### Data Mapping

```typescript
// scheduledCalls._id → stage.data.scheduledCallId
// calendarEventId → preserved in scheduledCalls; stage reads via repository join if needed
```

## Azure Storage (Documents)

| Use Case                        | Stage Type     | Mechanism                               |
| ------------------------------- | -------------- | --------------------------------------- |
| Assignment Artifact (recruiter) | assignment     | Pre-signed upload or link reference     |
| Candidate Submission            | assignment     | Pre-signed upload → `submissionUrl`     |
| Offer Letter                    | offer          | Pre-signed upload before stage creation |
| Onboarding Docs                 | offer_accepted | Each doc entry appended after upload    |

### Security

- Pre-signed URLs TTL (≤15 min) enforced by storage service.
- File size capped (5MB) validated client & server.
- MIME type validation (PDF, DOC, image set) before metadata persistence.

## Notification Service

Used for key stage lifecycle events:

- Stage created (notify candidate if visible & actionable)
- Feedback submitted
- Interview scheduled or reschedule approved/denied
- Offer sent / accepted / revoked
- Disqualification

### Payload Standardization

```json
{
  "type": "STAGE_EVENT",
  "stageType": "assignment",
  "stageStatus": "awaiting_recruiter",
  "applicationId": "...",
  "actor": { "role": "candidate", "id": "..." },
  "timestamp": "ISO8601"
}
```

## Timeline Service

- Continues logging immutable events for analytics & auditing.
- Stage transitions produce derived timeline events to maintain historical continuity.

## Feature Flag Provider

Controls rollout of dynamic stages:

- `FEATURE_DYNAMIC_STAGES` gate all create/update mutations.
- Read operations always attempt to return new model; fallback to legacy transformation if flag disabled.

## Future Integrations (Hooks Prepared)

| Potential Integration | Prepared Hook                                  |
| --------------------- | ---------------------------------------------- |
| External ATS sync     | Stage transition event bus topic               |
| AI scoring            | StageService post-transition callback registry |
| Bulk Operations       | Repository batch update method stub            |

## Failure Handling & Resilience

| Integration          | Failure Mode                | Strategy                                         |
| -------------------- | --------------------------- | ------------------------------------------------ |
| Calendar             | Event creation fails        | Rollback stage creation, surface retry action    |
| Storage              | Upload URL generation fails | Return actionable error with retry advice        |
| Notifications        | Webhook timeout             | Retry with exponential backoff + dead-letter log |
| Feature Flag Service | Unavailable                 | Assume disabled; deny mutations safely           |

## Observability & Metrics

- Calendar: success vs failure counts, latency distribution.
- Storage: upload URL generation latency, rejection reasons (size/type).
- Notifications: delivery success %, retry backlog size.

## Security Alignment

- OAuth scopes (Calendar) unchanged from Epic 4.
- Encrypted storage of external webhook URLs (Google Chat) continues.
- No new external credential types introduced in Epic 5.
