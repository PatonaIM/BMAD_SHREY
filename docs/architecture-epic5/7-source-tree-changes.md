# 7. Source Tree Changes

## New & Modified Paths

| Path                                                   | Type | Purpose                                           |
| ------------------------------------------------------ | ---- | ------------------------------------------------- |
| `src/shared/types/applicationStage.ts`                 | NEW  | Stage model & enums                               |
| `src/utils/stageHelpers.ts`                            | NEW  | Pure utilities (creation, sorting, progress calc) |
| `src/utils/stageValidation.ts`                         | NEW  | Transition & invariant validation rules           |
| `src/services/stageService.ts`                         | NEW  | Orchestrates stage lifecycle operations           |
| `src/data-access/repositories/applicationStageRepo.ts` | NEW  | Data persistence abstraction                      |
| `src/hooks/useStages.ts`                               | NEW  | Fetch stages & subscribe to updates               |
| `src/hooks/useStageActions.ts`                         | NEW  | Derive & execute role actions                     |
| `src/components/timeline/`                             | NEW  | Timeline refactored components                    |
| `src/components/recruiter/actions/`                    | NEW  | Recruiter modals (assignment, offer, disqualify)  |
| `src/components/candidate/stages/`                     | NEW  | Candidate stage displays                          |
| `scripts/migrations/migrate-to-stages.ts`              | NEW  | One-off migration script                          |
| `__tests__/services/stageService.test.ts`              | NEW  | Unit tests                                        |
| `__tests__/security/stage-access-control.test.ts`      | NEW  | Access control tests                              |
| `__tests__/e2e/application-timeline.spec.ts`           | NEW  | Playwright E2E                                    |

## Naming Conventions

- Stage-specific React components: `<Type>Stage.tsx` (e.g. `AssignmentStage`).
- Action modals: `<Verb><Entity>Modal.tsx` (e.g. `SendOfferModal`).
- Repository files suffixed with `Repo` to differentiate domain services vs persistence.

## tRPC Router Adjustments

| File                                                | Change                                  |
| --------------------------------------------------- | --------------------------------------- |
| `src/services/trpc/recruiterRouter.ts`              | Add stage mutations & permission guards |
| `src/services/trpc/candidateRouter.ts`              | Add candidate stage actions             |
| (Optional) `src/services/trpc/applicationRouter.ts` | Expose consolidated stage queries       |

## Lint & Type Config

- Ensure `tsconfig.json` includes new `src/utils`, `src/services`, and timeline component directories.
- Add path alias `@stages/*` (optional) for stage-related modules to reduce relative path churn.

## Test Directory Layout

```
__tests__/
  services/
    stageService.test.ts
  security/
    stage-access-control.test.ts
  e2e/
    application-timeline.spec.ts
```

## Script Placement

Migration scripts reside under `scripts/migrations/` to align with existing repo conventions and to allow ephemeral execution without polluting service layer.

## Deletion / Deprecation

- No immediate deletions; legacy timeline remains until post-rollout cleanup story (future epic or Story 5.12 extension).

## Future-Proofing

- Reserve `src/services/workflowTemplateService.ts` (not created now) for Epic 6.
- Reserve `src/services/automationRuleService.ts` for Epic 8.
