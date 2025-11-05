# EP5-S9: Security & Token Management

As a platform,
I want secure, ephemeral tokens for realtime AI and storage operations,
So that exposure risk and replay attacks are minimized.

## Scope

- Ephemeral OpenAI realtime token issuance (server-side signed)
- SAS token for Azure chunk uploads (scope: session path only, short TTL)
- Token refresh workflow prior to expiration
- Audit logging of token issuance & refresh

## Acceptance Criteria

1. OpenAI token valid ≤2 minutes; refresh enacted at T-30s
2. SAS token TTL ≤15 minutes; renewed if interview exceeds initial window
3. Token leakage detection (heuristic: >X requests from different IP in short window) logs security alert
4. No tokens ever persisted beyond session lifespan
5. Audit log entry: {event:'token_issue', sessionId, type, expiresAt}

## Tests

- Unit: refresh scheduler
- Security: ensure tokens not logged raw

## Definition of Done

Ephemeral tokens with safe lifecycle & audit trail.
