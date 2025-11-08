# Epic 5 Full-Stack Architecture: Dynamic Multi-Stage Application Timeline System

## Table of Contents

- [1. Introduction & Existing System Analysis](./1-introduction-existing-project-analysis.md)
- [2. Enhancement Scope & Integration Strategy](./2-enhancement-scope-integration-strategy.md)
- [3. Data Models & Schema Changes](./3-data-models-schema-changes.md)
- [4. Component Architecture](./4-component-architecture.md)
- [5. API Design (tRPC Stage Operations)](./5-api-design.md)
- [6. External Service Integration](./6-external-api-integration.md)
- [7. Source Tree Changes](./7-source-tree-changes.md)
- [8. Infrastructure & Deployment](./8-infrastructure-deployment.md)
- [9. Security & Compliance](./9-security-compliance.md)
- [10. Testing Strategy](./10-testing-strategy.md)
- [11. Architect Checklist Results](./11-architect-checklist-results.md)
- [12. Next Steps & Future Evolution](./12-next-steps.md)

## Architectural Intent

Epic 5 transforms the linear status-based application flow into a dynamic, stage-based timeline supporting multiple assignments and live interviews with role-specific visibility and action surfaces. It reuses stable Epic 4 subsystems (Calendar scheduling, Notifications, Timeline events) while introducing a polymorphic `ApplicationStage` model and stage lifecycle orchestration through a dedicated service layer.

## High-Level Evolution

| Aspect            | Epic 4                           | Epic 5 Change                                                      |
| ----------------- | -------------------------------- | ------------------------------------------------------------------ |
| Timeline Model    | Append-only events               | Ordered mutable stages + derived events                            |
| Interviews        | Single scheduled call + feedback | Up to 3 live_interview stages with booking & reschedule support    |
| Assignments       | N/A                              | Up to 3 assignment stages with upload + recruiter feedback         |
| Offer Flow        | Basic status                     | Structured offer & acceptance stages with onboarding documents     |
| Visibility        | Role-filtered events             | Stage-level visibility + action gating                             |
| Actions           | Discrete mutation endpoints      | Contextual actions inferred from stage state                       |
| Scheduling        | Calendar integration             | Reused; stage-data linkage via `scheduledCallId`                   |
| Document Handling | Limited uploads                  | Azure Storage integrated per-stage (assignment, offer, onboarding) |
| Migration         | None                             | Status+timeline → stages array with backward compatibility window  |

## Core Architectural Themes

1. Stage Lifecycle State Machines per type (assignment, live_interview, offer)
2. Central `StageService` enforcing transition rules & invariants
3. Repository abstraction for stage projections & role-filtered queries
4. Structured action resolution (derive candidate & recruiter actions server-side)
5. Safe progressive rollout (feature flag + migration dry runs)
6. Index-driven query performance for stage retrieval & transition frequency monitoring

## Read This First

If you need a quick orientation: read sections 1–3 for model understanding, then 5 (API Design) and 9 (Security) before implementing or extending anything.
