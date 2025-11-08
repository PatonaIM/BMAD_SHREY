# 10. Testing Strategy

## Objectives

Validate correctness of lifecycle transitions, role-based filtering, migration integrity, and UX action surfacing while maintaining performance budgets.

## Test Pyramid

| Layer                  | Focus                                              | Tooling                            |
| ---------------------- | -------------------------------------------------- | ---------------------------------- |
| Unit                   | Pure utils & StageService logic                    | Vitest                             |
| Integration            | tRPC procedures + repository + services            | Vitest + in-memory Mongo / test db |
| E2E                    | Critical user flows (assignment, interview, offer) | Playwright                         |
| Security               | Access control, invalid transitions                | Vitest (security suite)            |
| Performance (Targeted) | Timeline load & transition latency                 | Scripted benchmarks                |

## Core Unit Tests

| Module          | Cases                                      |
| --------------- | ------------------------------------------ |
| stageValidation | Valid/invalid transitions per type         |
| stageHelpers    | Creation ordering & sorting                |
| StageService    | create, update, insert, reorder invariants |

## Integration Tests

Scenarios:

- Create → Submit assignment flow
- Schedule → Complete interview with feedback
- Offer send → accept → onboarding doc upload
- Disqualification mid-process

## E2E Scenarios (Playwright)

1. Candidate views timeline, uploads assignment, sees feedback.
2. Recruiter creates interview, candidate books, recruiter submits feedback.
3. Offer acceptance & onboarding document uploads.
4. Disqualification removal of future stages.

## Security Tests

- Candidate tries `createStage` (403 expected).
- Unauthorized status jump (pending → completed direct).
- Hidden stage not returned in candidate fetch.

## Performance Benchmarks

| Metric                           | Threshold          |
| -------------------------------- | ------------------ |
| getStages (10 stages)            | <150ms server time |
| updateStageStatus                | <200ms end-to-end  |
| Assignment upload metadata write | <300ms             |

## Test Data Strategy

- Factory helpers generate consistent stages arrays.
- Randomized fuzz for transition sequences to detect edge invalid paths.

## Migration Testing

1. Construct legacy fixtures with varied statuses & timelines.
2. Run migration transform function directly (unit-level).
3. Full script dry-run against staged sample set.
4. Verify invariants (no duplicate order, valid currentStageId, multiplicity constraints).

## Coverage Goals

- StageService & validation >90% branch coverage.
- Overall stage-related code >85%.

## Tooling & CI

- Separate CI job segment for migration script dry-run using anonymized sample DB.
- Report: transition error codes distribution, average mutation latency.

## Flake Management

- Isolate time-dependent tests (interview scheduling) with fixed clock via `vi.setSystemTime`.
- Retry policy only for E2E network-sensitive cases (max 2 retries).

## Observability Verification

- Assert structured log presence for representative transitions (log sink mock during tests).
