# 1. Introduction & Existing System Analysis

## Project Overview

Epic 5 introduces a dynamic multi-stage timeline system for candidate applications. Instead of a single `status` enum and append-only `timeline` events, applications now own an ordered `stages[]` array describing discrete lifecycle containers (submit_application, ai_interview, assignment, live_interview, offer, offer_accepted). Each stage has:

- Stable ID (UUID)
- Type & lifecycle status
- Polymorphic data payload
- Visibility & derived role actions
- Timestamps & audit metadata

## Existing Architecture (Epic 4 Reuse)

We deliberately reuse several hardened subsystems delivered in Epic 4:

- `GoogleCalendarService` — creates calendar events & manages availability slots.
- `scheduledCalls` collection — canonical record of booked interviews; now referenced by `LiveInterviewData.scheduledCallId`.
- `NotificationService` — emits recruiter & candidate notifications (email/Google Chat) on stage transitions.
- `TimelineService` — continues logging stage-related events for historical and analytics purposes.

## Gap Analysis

| Area                   | Current Capability (Epic 4) | Required Enhancement (Epic 5)                                                    |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| Progress Modeling      | Single status + events      | Ordered mutable multi-stage container model                                      |
| Concurrent Stage Types | None                        | Multiplicity for assignment & live_interview (max 3 each)                        |
| Action Surfacing       | Client-computed buttons     | Server-side derivation based on stage state & role                               |
| Feedback Storage       | Interview feedback only     | Uniform feedback structure for assignments & interviews                          |
| Offer Lifecycle        | Basic transition            | Explicit offer + acceptance stages with onboarding data                          |
| Document Uploads       | Limited (resume, etc.)      | Per-stage Azure file handling (assignment answer, offer letter, onboarding docs) |
| Rescheduling           | Call cancellation           | Formal reschedule request embedded in stage data                                 |

## Constraints & Non-Goals

- No workflow template authoring (planned Epic 6).
- No AI predictive sequencing (planned Epic 7).
- No automated rule-based stage progression (planned Epic 8).
- No multi-recruiter parallel evaluation (planned Epic 9).

## Success Definition

Architecture succeeds if: migration executes safely, performance remains <3s timeline load with 10 stages, role-based filtering leaks zero restricted data, and extensibility enables future workflow automation without refactoring core primitives.
