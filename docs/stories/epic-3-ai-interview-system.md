# Epic 3: Interactive AI Interview System – User Stories

Source: `docs/prd.md` Epic 3. IDs EP3-S#.

## EP3-S1 Job Application System

As a job seeker,
I want to apply and get an initial score,
So that I understand baseline fit.

Acceptance Criteria:

- Apply creates application record + score
- Duplicate prevention
- Optional cover letter & extras
- Email confirmation (stub acceptable)

DoD:

- [ ] Application schema
- [ ] Apply endpoint + tests
- [ ] Duplicate guard logic

## EP3-S2 AI Interview Scheduling & Setup

As a job seeker,
I want to schedule or start an AI interview,
So that I can boost my score.

Acceptance Criteria:

- Immediate start or schedule
- Prep guide + environment check
- Reminder stub
- Reschedule/cancel within rules

DoD:

- [ ] Scheduling model
- [ ] Environment diagnostic utility
- [ ] Reminder service placeholder

## EP3-S3 Dynamic Interview Question Generation

As a system,
I want tailored interview questions,
So that assessment is relevant.

Acceptance Criteria:

- 8–12 questions generated with balance (technical vs communication)
- Difficulty calibrates to candidate & role
- Fallback static bank

DoD:

- [ ] Question generator module
- [ ] Fallback bank JSON
- [ ] Difficulty calibration tests

## EP3-S4 Real-time AI Interview Interface

As a job seeker,
I want a natural voice AI interview,
So that I can demonstrate skills.

Acceptance Criteria:

- Realtime API streaming (<500ms target)
- D-ID avatar integrated
- Mic controls + status cues
- Recording + transcript

DoD:

- [ ] WebRTC/Realtime wrapper
- [ ] Avatar component
- [ ] Recording storage strategy stub

## EP3-S5 AI Interview Scoring & Analysis

As a system,
I want to score responses (technical & communication),
So that performance gains are quantified.

Acceptance Criteria:

- Weighting 60/40 applied
- Per-question score breakdown
- Boost calculation (5–15 points)
- Completion <30s after interview end

DoD:

- [ ] Scoring algorithm module
- [ ] Boost calculator tests
- [ ] Timing benchmark

## EP3-S6 Interview Results & Feedback

As a job seeker,
I want detailed feedback & replay,
So that I can improve.

Acceptance Criteria:

- Overall + component scores
- Question breakdown + suggestions
- Replay & transcript
- Benchmark comparison

DoD:

- [ ] Results endpoint
- [ ] Feedback generator stub
- [ ] Replay UI placeholder

## EP3-S7 Application Status Integration

As a job seeker,
I want interview impact reflected in application,
So that progress is visible.

Acceptance Criteria:

- Status update to AI Interview Complete
- Timeline entry logged
- Dashboard updates immediately

DoD:

- [ ] Status transition logic
- [ ] Timeline event store
- [ ] UI refresh tests

## EP3-S8 Interview Recording & Recruiter Access

As a recruiter,
I want secure access to recordings & AI assessments,
So that I can validate scores.

Acceptance Criteria:

- Auth-protected retrieval
- Transcript + summary view
- Notes/annotations
- Audit logging of access

DoD:

- [ ] Recording access endpoint
- [ ] Annotation model
- [ ] Audit hook integration

---

Epic 3 ready when real-time latency tracked and scoring verified.
