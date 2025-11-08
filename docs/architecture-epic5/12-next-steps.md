# 12. Next Steps & Future Evolution

## Immediate (Post-Architecture Sign-Off)

| Item                                       | Owner    | Goal                                     |
| ------------------------------------------ | -------- | ---------------------------------------- |
| Implement types & migration script         | Backend  | Complete Story 5.1                       |
| StageService core CRUD & validation        | Backend  | Complete Story 5.2 foundation            |
| Timeline UI scaffolding & placeholder data | Frontend | Prepare for Story 5.3 visual integration |

## Short-Term Enhancements

| Enhancement                      | Target Sprint | Rationale                        |
| -------------------------------- | ------------- | -------------------------------- |
| Stage action telemetry           | Sprint 2      | UX insight into action friction  |
| Latency metrics dashboard        | Sprint 2      | Validate performance budgets     |
| Structured error surfacing in UI | Sprint 2      | Improve developer & user clarity |

## Deferred Roadmap (From Epic 5 Scope)

| Deferred Item                  | Future Epic | Notes                             |
| ------------------------------ | ----------- | --------------------------------- |
| Workflow templates             | Epic 6      | Predefined stage sequences        |
| AI predictive insights         | Epic 7      | Candidate progression forecasting |
| Automation rules               | Epic 8      | Conditional auto-transitioning    |
| Collaboration & multi-reviewer | Epic 9      | Parallel feedback channels        |

## Technical Debt Watchlist

| Debt                            | Potential Impact             | Mitigation Timing                            |
| ------------------------------- | ---------------------------- | -------------------------------------------- |
| Lack of caching for heavy reads | Latency under scale          | Re-evaluate after adoption metrics           |
| Single feedback object limit    | Reduced reviewer flexibility | Extend schema in Epic 9                      |
| Monolithic StageService growth  | Harder maintenance           | Consider service segmentation after >500 LOC |

## Optimization Candidates

| Candidate                     | Metric to Monitor            |
| ----------------------------- | ---------------------------- |
| Stage fetch projection tuning | p95 getStages latency        |
| Pre-signed URL batching       | Upload flow TTFB             |
| Client-side memoization depth | Re-render counts in profiler |

## End-of-Rollout Cleanup

| Task                              | Condition to Execute                        |
| --------------------------------- | ------------------------------------------- |
| Remove legacy `status` references | Stability >2 weeks & zero rollback triggers |
| Archive migration script          | After production success verification       |
| Consolidate timeline events       | After analytics verify redundancy removal   |

## Success Metrics Revalidation

Post-launch, validate original metrics (performance, adoption, satisfaction). Adjust budgets if stage counts or interaction complexity increase.

## Continuous Improvement Loop

1. Instrument usage.
2. Review KPI dashboards weekly.
3. Feed actionable insights into backlog grooming.
4. Schedule quarterly architecture review to ensure extensibility remains healthy.
