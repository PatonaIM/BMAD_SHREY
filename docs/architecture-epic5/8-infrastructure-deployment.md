# 8. Infrastructure & Deployment

## Deployment Strategy

Feature flag gated rollout across staged percentages: 10% → 50% → 100%. Each increment contingent on stability metrics & absence of migration anomalies.

## Environment Variables (New / Adjusted)

| Variable                            | Purpose                                 | Notes                         |
| ----------------------------------- | --------------------------------------- | ----------------------------- |
| `FEATURE_DYNAMIC_STAGES`            | Enables stage-based timeline            | Boolean toggle                |
| `AZURE_STORAGE_STAGE_DOC_CONTAINER` | Dedicated container for stage artifacts | Isolation for lifecycle purge |

## Migration Pipeline

| Step        | Action                             | Tooling                                   |
| ----------- | ---------------------------------- | ----------------------------------------- |
| Backup      | Snapshot production DB             | Managed Atlas backup                      |
| Dry Run     | Execute script with `--dry-run`    | `scripts/migrations/migrate-to-stages.ts` |
| Review      | Validate counts & invariants       | Automated report JSON                     |
| Execute     | Run migration without dry flag     | Same script                               |
| Verify      | Sample apps & run integrity checks | Script subcommand `--verify`              |
| Flag Enable | Turn on feature flag (10%)         | Runtime config / env update               |

## Migration Script CLI (Proposed)

```bash
node scripts/migrations/migrate-to-stages.js --dry-run
node scripts/migrations/migrate-to-stages.js --execute --batch-size=200
node scripts/migrations/migrate-to-stages.js --verify --sample-size=50
```

## Observability & Monitoring

| Metric                     | Source                | Dashboard           |
| -------------------------- | --------------------- | ------------------- |
| Stage transition latency   | Structured logs       | Performance panel   |
| Mutation error rate        | tRPC error formatter  | Error metrics panel |
| Upload failures            | Storage service logs  | Ops dashboard       |
| Disqualification frequency | StageService counters | Product analytics   |

## Alerting Thresholds

| Alert                       | Condition                        |
| --------------------------- | -------------------------------- |
| High mutation error rate    | >0.2% in 5-min window            |
| Migration integrity failure | Any invariant violation detected |
| Latency regression          | p95 transition latency >500ms    |

## Rollback Procedure

1. Disable feature flag.
2. Revert applications to legacy `status` interpretation (stages still present but ignored).
3. If structural corruption detected, restore from backup (only under explicit severity triggers—rare expectation).

## Performance Optimization Levers

| Lever                    | Scenario                               |
| ------------------------ | -------------------------------------- |
| Add selective projection | Large stage arrays (future >25)        |
| Introduce Redis cache    | High read contention & latency spikes  |
| Background index build   | Additional compound indexes post scale |

## Capacity Planning (MVP)

- Estimated additional document size: ~1–2 KB per stage.
- With 10 stages: +10–20 KB per application, well within MongoDB document limits.

## Deployment Validation Checklist

- Migration dry run PASS.
- Smoke tests PASS with feature flag disabled & enabled.
- Security probes PASS (no unauthorized stage leakage).
- Performance baseline recorded (p50/p95).
