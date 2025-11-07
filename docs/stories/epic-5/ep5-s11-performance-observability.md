# EP5-S11: Performance & Observability Instrumentation

As engineering,
I want granular metrics and logs around latency, recording, and resource usage,
So that we can tune and ensure SLA adherence.

## Scope

- Metrics: question_latency_ms, ai_audio_start_latency_ms, chunk_upload_ms, reconnect_count
- Aggregated session summary object
- Lightweight logger wrapper (JSON structured)
- Optional dev panel for live metrics (feature flag)

## Acceptance Criteria

1. Metrics emitted with sessionId context
2. Session summary persisted with averages & p95 values
3. Logger enforces field schema (drops disallowed keys)
4. Dev panel toggle hidden behind config
5. No personally identifiable info in metrics/logs

## Tests

- Unit: metrics aggregator
- Unit: logger schema enforcement

## Definition of Done

Actionable performance data available post-session & during dev.
