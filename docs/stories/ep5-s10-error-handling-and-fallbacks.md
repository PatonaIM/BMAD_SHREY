# EP5-S10: Error Handling & Fallbacks

As a system,
I want graceful, categorized error handling with user-facing fallbacks,
So that interviews remain robust under adverse conditions.

## Scope

- Error taxonomy (network, permission, generation, upload, scoring)
- User-friendly messaging + retry paths
- Automatic fallback triggers (webcam-only recording, question bank usage)

## Acceptance Criteria

1. Error codes follow prefix convention (INT\_\*)
2. Each error captured with structured log (event, code, sessionId)
3. Fallback escalation order documented & implemented
4. User sees contextual recovery instructions (no raw stack traces)
5. Escalating repeated failures (≥3 in 2 min) → session end with partial save

## Tests

- Unit: fallback resolver
- Integration: simulate upload failure chain

## Definition of Done

Consistent error framework with observable, user-safe fallbacks.
