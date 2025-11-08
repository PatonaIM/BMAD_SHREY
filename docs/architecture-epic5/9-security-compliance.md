# 9. Security & Compliance

## Security Objectives

- Prevent cross-role data leakage (candidate must not see recruiter-only metadata or hidden stages).
- Ensure only valid lifecycle transitions occur (tamper resistant).
- Protect uploaded documents & pre-signed URL misuse.

## Threat Model Highlights

| Threat                     | Vector                       | Mitigation                                                  |
| -------------------------- | ---------------------------- | ----------------------------------------------------------- |
| Unauthorized status change | Candidate forging mutation   | Role guard + server-only action derivation                  |
| Hidden stage leakage       | Client overfetch & filtering | Server-side visibility filtering in repository              |
| Document exfiltration      | Long-lived URLs              | Short TTL + scoped SAS policy                               |
| Replay of createStage      | Duplicate stage injection    | Multiplicity & invariant guard + optional idempotency token |
| Mass mutation abuse        | Automated spam               | Rate limiting per procedure                                 |

## Role-Based Access Control (RBAC)

| Operation                | Candidate         | Recruiter |
| ------------------------ | ----------------- | --------- |
| Read visible stages      | ✓ (filtered)      | ✓ (all)   |
| Create stage             | ✗                 | ✓         |
| Update stage status      | ✗                 | ✓         |
| Upload assignment answer | ✓ (if actionable) | ✗         |
| Submit feedback          | ✗                 | ✓         |
| Respond to offer         | ✓                 | ✗         |
| Disqualify application   | ✗                 | ✓         |

## Visibility Rules

- Candidate receives: completed stages, current stage, and next teaser (optional future enhancement toggle).
- Recruiter receives: full ordered list.
- Disqualified apps: candidate receives read-only completed + disqualification banner.

## Data Filtering Implementation

```typescript
function filterStagesForCandidate(
  stages: ApplicationStage[],
  currentId: string
): ApplicationStage[] {
  return stages.filter(s => s.visibleTo.includes('candidate'));
}
```

(Actual logic extended to incorporate teaser rules.)

## Validation & Transition Controls

Central validation:

```typescript
validateStageTransition(stage: ApplicationStage, next: StageStatus): ValidationResult
```

Ensures allowed edges per state machine, rejects illegal jumps.

## Upload Security

- Client requests pre-signed URL via secure mutation.
- Server validates content-type & size metadata before persisting stage reference.
- Logs contain hash for dedup detection.

## Logging & Audit

- Structured logs for every mutation with actor role, stageId, timing, result.
- Timeline events persist immutable snapshot of transitions for forensic analysis.

## Rate Limiting (tRPC Middleware)

Policy map keyed by procedure name; sliding window counters stored in memory (MVP) → upgrade to Redis for distributed environment.

## Compliance Considerations

- PII: Avoid storing sensitive personal documents outside controlled onboarding docs; restrict access to recruiter role.
- Data retention: Stage data retained while application exists; future archival policy can move completed stages to cold storage.
- Encryption: Offer letters & submissions stored in encrypted Azure container (at rest). Pre-signed URLs over HTTPS.

## Security Testing Checklist

| Test                          | Description                               |
| ----------------------------- | ----------------------------------------- |
| Unauthorized mutation attempt | Candidate calling recruiter-only endpoint |
| Hidden stage enumeration      | Candidate probing API for hidden stageId  |
| Transition bypass             | Direct call setting disallowed status     |
| Large file upload             | Attempt >5MB submission                   |
| Pre-signed URL reuse          | Access after expiry                       |

## Incident Response Hooks

- Alert on repeated `INVALID_TRANSITION` errors > threshold (potential probing).
- Security dashboard surfaces distinct unauthorized attempts per hour.

## Future Hardening

| Enhancement                 | Rationale                                 |
| --------------------------- | ----------------------------------------- |
| Fine-grained document ACL   | Multi-interviewer collaboration readiness |
| Signed action tokens        | Prevent CSRF in multi-client contexts     |
| Immutable stage history log | Tamper resistance beyond timeline events  |
