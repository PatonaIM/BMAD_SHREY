# EP5 Alignment Summary with Existing Interview Documentation

Date: 2025-11-05

## Purpose

Concise mapping between Epic 5 (greenfield realtime interview page) and prior Interview System artifacts (Epic 3 + refactor plans) to ensure intentional divergence and reuse boundaries.

## Source Docs Considered

- `epic-3-ai-interview-system.md`
- `interview-architecture-visual-guide.md`
- `interview-refactoring-plan-summary.md`

## Intentional Divergences

| Area                | Epic 3 / Refactor                       | Epic 5 Direction                       | Rationale                                              |
| ------------------- | --------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| Component Reuse     | Large monolithic + split-panel refactor | No reuse; fresh minimal shell          | Avoid inherited complexity, validate lean architecture |
| Coaching (Gemini)   | Integrated / planned (panel separation) | Out-of-scope initial                   | Faster delivery; reduce dual-pipeline complexity       |
| Transcript UI       | Present / removed in refactor plan      | Deferred                               | Focus performance + adaptive Q&A first                 |
| Multi-panel Layout  | Split (Interviewer vs Helper)           | Single unified page (later extensible) | Lower initial surface area, simpler recording          |
| Recording           | Camera or later canvas                  | Canvas composite from start            | Recruiter context completeness priority                |
| Adaptive Difficulty | Implemented with tiers                  | Recreated (simplified heuristics)      | Independent evaluation path & refinement               |
| Retake Policy       | Included in Epic 3                      | Not in initial scope                   | Keep MVP smaller; revisit after stability              |

## Reused Conceptual Patterns (Not Code)

- Difficulty tier escalation/demotion heuristics
- Domain quota enforcement (technical ≥3 etc.)
- PCM16 streaming to OpenAI Realtime
- Chunked upload & manifest integrity

## New Additions in Epic 5

| Feature                            | Description                              | Why New                                           |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Just-in-time question generation   | No pre-generated list; context each turn | Improves relevance & reduces prompt bloat         |
| Technical weighting profiles v2    | Externalized role-based multipliers      | Clear audit & calibration path                    |
| Unified canvas compositor from MVP | Capture full UI + PiP                    | Higher recruiter review fidelity                  |
| Slim session state machine         | Minimal finite states with snapshot      | Reliability without large orchestrator complexity |

## Dependency Separation Principles

1. No direct imports from legacy `InterviewInterface.tsx`.
2. Shared types can live in `shared/types/interviewV2.ts` (planned) without referencing v1 shapes.
3. Feature flags differentiate v1 vs v2 page routing.

## Risk Avoidance

- Avoid incremental grafting onto refactor branch (prevents scope creep).
- Keep scoring formulas versioned (`scoreReport.version`).

## Alignment Outcome

Epic 5 proceeds as a clean slice; review again before introducing coaching or recruiter live access to prevent divergence into a second monolith.

## User Story Index (Epic 5)

| ID      | Title                          | Core Objective                             | Key Deliverables                                        |
| ------- | ------------------------------ | ------------------------------------------ | ------------------------------------------------------- |
| EP5-S1  | Permissions & Device Readiness | Reliable camera/mic access & diagnostics   | Unified permission gate, network test, preview          |
| EP5-S2  | Realtime OpenAI Integration    | Low-latency audio streaming & playback     | WebSocket client, PCM16 bridge, turn states             |
| EP5-S3  | Dynamic Contextual Questioning | Adaptive just-in-time question generation  | Context assembler, domain quota + tier engine           |
| EP5-S4  | Canvas Composite Recording     | Full UI + webcam + mixed audio capture     | Canvas compositor, PiP overlay, mixed audio stream      |
| EP5-S5  | Chunked Azure Upload           | Resilient chunked recording persistence    | Chunk queue, hash validation, manifest finalize         |
| EP5-S6  | Post-Interview Scoring         | Multi-factor role-weighted scoring & boost | Aggregation logic, boost formula, persistence           |
| EP5-S7  | Technical Role Weighting       | Configurable role-based multipliers        | Profile storage, resolver, audit trail                  |
| EP5-S8  | Session State & Recovery       | Deterministic lifecycle + refresh recovery | Finite state machine, periodic snapshots                |
| EP5-S9  | Security & Token Mgmt          | Ephemeral tokens + audited lifecycle       | Token issuance, refresh scheduler, audit logs           |
| EP5-S10 | Error Handling & Fallbacks     | Graceful degradation & user messaging      | Error taxonomy, fallback resolver, structured logs      |
| EP5-S11 | Performance & Observability    | Actionable latency & reliability metrics   | Metrics aggregator, session summary, dev panel          |
| EP5-S12 | Accessibility & Privacy        | Baseline A11y + PII minimization           | ARIA live regions, keyboard shortcuts, hashed fragments |
| EP5-S13 | Future Enhancements Backlog    | Curated forward-looking improvements       | Prioritized backlog list (no implementation)            |

### Cross-Cutting Themes

- Idempotency across mutations (session start, chunk upload, question events)
- Strict separation of realtime vs control plane
- Privacy-first context referencing (hash fragments, no raw resume duplication)
- Performance instrumentation baked into story acceptance criteria

### Story Sequencing Recommendation

1. S1 → S2 → S3 (core realtime loop foundation)
2. S4 & S5 in parallel once loop stable
3. S6–S7 scoring & weighting after recording finalization path proven
4. S8–S9 hardening (state + security) before broader rollout
5. S10–S11 reliability & observability polish pre beta
6. S12 accessibility before public exposure
7. S13 backlog grooming continuous

### Exit Criteria Alignment

Completion of S1–S12 satisfies Epic 5 DoD; S13 remains optional backlog.

Prepared by Winston
