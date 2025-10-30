# Epic 3: Interactive AI Interview System – User Stories

Source: `docs/prd.md` Epic 3. IDs EP3-S#.

**UPDATED for Simplified Candidate Flow:** Epic 3 now focuses on AI interview as score boosting mechanism, implementing step 10 where candidates can give AI interviews to boost their profile and application scores.

## EP3-S1 Job Application System

As a job seeker,
I want to apply and get an initial score,
So that I understand baseline fit.

**Flow Position:** Step 6-7 - Application submission, score generation, redirect to dashboard.

**ENHANCED:** Post-application flow now provides immediate guidance based on score.

Acceptance Criteria:

- Apply creates application record + score
- Duplicate prevention
- Optional cover letter & extras
- Email confirmation (stub acceptable)
- **NEW:** Calculate match score immediately on submission
- **NEW:** Show post-application modal with score and next steps
- **NEW:** If score 60-85%: Show "Boost with AI Interview" CTA
- **NEW:** If score <60%: Show "Improve Profile" recommendations
- **NEW:** If score >85%: Show "Strong Match!" encouragement
- **NEW:** Redirect to dashboard after modal dismissed
- **NEW:** Store application in timeline with initial score

DoD:

- [ ] Application schema
- [ ] Apply endpoint + tests
- [ ] Duplicate guard logic
- [ ] **NEW:** Post-application modal component (PostApplicationModal)
- [ ] **NEW:** Score threshold logic (60%, 85% breakpoints)
- [ ] **NEW:** AI interview invitation flow
- [ ] **NEW:** Profile improvement recommendations generator
- [ ] **NEW:** Dashboard redirect with success toast

## EP3-S2 AI Interview Scheduling & Setup

As a job seeker,
I want to schedule or start an AI interview,
So that I can boost my score.

**Flow Position:** Step 10 - Candidate can give AI interview to boost profile.

**ENHANCED:** Interview now accessible from multiple entry points with clear value proposition.

Acceptance Criteria:

- Immediate start or schedule
- Prep guide + environment check
- Reminder stub
- Reschedule/cancel within rules
- **NEW:** Accessible from dashboard quick actions ("Take AI Interview")
- **NEW:** Accessible from application detail page ("Boost This Application")
- **NEW:** Accessible from post-application modal (for 60-85% scores)
- **NEW:** Show potential score boost estimate (e.g., "Could boost score by 5-15 points")
- **NEW:** Display interview preparation tips and expected questions topics
- **NEW:** Environment check: microphone, internet speed, browser compatibility
- **NEW:** Practice mode option (no score impact, just practice)

DoD:

- [ ] Scheduling model
- [ ] Environment diagnostic utility
- [ ] Reminder service placeholder
- [ ] **NEW:** AIInterviewCard component (dashboard widget)
- [ ] **NEW:** ScheduleInterviewModal component
- [ ] **NEW:** Score boost estimator algorithm
- [ ] **NEW:** Preparation guide content (markdown)
- [ ] **NEW:** Environment check utility (WebRTC test)
- [ ] **NEW:** Practice mode toggle + flag

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

**Flow Position:** Step 10-11 - Interview completion updates application and shows new score.

**ENHANCED:** Clear before/after score visualization with celebration.

Acceptance Criteria:

- Status update to AI Interview Complete
- Timeline entry logged
- Dashboard updates immediately
- **NEW:** Show before/after score comparison
- **NEW:** Display score boost amount (e.g., "+12 points")
- **NEW:** Celebration UI (confetti, success animation)
- **NEW:** Update application card badge to show "Interview Complete"
- **NEW:** Add interview recording link to application detail
- **NEW:** Show updated position in match ranking (if applicable)
- **NEW:** Notify recruiter of interview completion (future)

DoD:

- [ ] Status transition logic
- [ ] Timeline event store
- [ ] UI refresh tests
- [ ] **NEW:** ScoreComparisonModal component (before/after)
- [ ] **NEW:** Celebration animation (confetti.js or similar)
- [ ] **NEW:** Application badge update logic
- [ ] **NEW:** Interview recording link storage
- [ ] **NEW:** Match ranking recalculation
- [ ] **NEW:** Recruiter notification stub (email/webhook)

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

---

## EP3-S9: Post-Application Score Guidance (NEW - Simplified Flow)

As a job seeker,
I want immediate feedback after applying,
So that I know if I should take additional actions.

**Flow Position:** Step 7 - Post-application, system redirects to dashboard with guidance.

**Purpose:** Provides contextual next steps based on match score, driving candidates toward profile completion or AI interview.

Acceptance Criteria:

- After application submission, calculate match score immediately
- Display modal with score and personalized message:
  - **<60% (Weak Match):**
    - Title: "Improve Your Profile to Boost This Application"
    - Message: "Your profile is missing key skills. Complete these sections to improve your match:"
    - Actions: "Complete Profile", "View Missing Skills", "Continue to Dashboard"
  - **60-85% (Good Match):**
    - Title: "Good Match! Boost Your Score with AI Interview"
    - Message: "You're a good fit for this role. Take a 15-minute AI interview to increase your score by 5-15 points."
    - Actions: "Schedule AI Interview", "Continue to Dashboard"
  - **>85% (Excellent Match):**
    - Title: "Excellent Match!"
    - Message: "Your profile strongly aligns with this role. We'll notify you as your application progresses."
    - Actions: "View Application", "Browse More Jobs"
- Modal includes:
  - Match score badge with color coding
  - Component breakdown (skills, experience, semantic match)
  - Timeline estimate ("Typically reviewed within 3-5 days")
- Auto-dismiss after 10 seconds or user action
- Redirect to dashboard after dismissal

DoD:

- [ ] PostApplicationModal component with score-based content
- [ ] Score threshold logic (60%, 85% breakpoints)
- [ ] Message content templates for each score band
- [ ] Score breakdown visualization (mini chart/bars)
- [ ] Action button routing (to profile, AI interview, dashboard)
- [ ] Auto-dismiss timer with progress indicator
- [ ] Modal responsive design (mobile, desktop)
- [ ] Unit tests for score threshold logic
- [ ] Integration test for application flow
- [ ] Analytics tracking (modal shown, action taken)

**Modal Wireframe:**

```
┌──────────────────────────────────────────┐
│  ✓ Application Submitted                 │
├──────────────────────────────────────────┤
│                                          │
│     🎯 Match Score: 72%                  │
│     [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │
│                                          │
│  Good Match! Boost Your Score            │
│  with AI Interview                       │
│                                          │
│  Your skills align well with this role.  │
│  Take a 15-min AI interview to boost     │
│  your score by up to 15 points.          │
│                                          │
│  Skills: 78% | Experience: 65%           │
│  Semantic: 73%                           │
│                                          │
│  [Schedule AI Interview]  [Dashboard]    │
│                                          │
│  Auto-closing in 8s...                   │
└──────────────────────────────────────────┘
```

---

## EP3-S10: AI Interview Dashboard Integration (NEW - Simplified Flow)

As a job seeker,
I want easy access to AI interview opportunities from my dashboard,
So that I can boost my applications whenever ready.

**Flow Position:** Step 10 - Dashboard provides clear path to AI interview.

**Purpose:** Makes AI interview prominent on dashboard as key profile/score improvement action.

Acceptance Criteria:

- Dashboard quick actions widget includes "Take AI Interview" button
- Button shows count of eligible applications (e.g., "Boost 3 Applications")
- Clicking opens interview scheduling modal with application selection
- Application cards show "Boost Score" button if:
  - Match score 60-85%
  - No interview completed yet
  - Application status is "submitted" or "under review"
- Interview card widget shows:
  - Number of completed interviews
  - Average score boost achieved
  - Next interview opportunity
- Practice interview option always available
- Interview history accessible from profile menu

DoD:

- [ ] AIInterviewWidget component (dashboard)
- [ ] Eligible applications counter logic
- [ ] Application selection modal (if multiple eligible)
- [ ] "Boost Score" button on application cards (conditional)
- [ ] Interview history panel component
- [ ] Practice interview mode toggle
- [ ] Interview statistics calculation (avg boost, completion rate)
- [ ] Integration with dashboard layout
- [ ] Responsive design for all devices
- [ ] Unit tests for eligibility logic
- [ ] Analytics tracking (button clicks, interview starts)

**Dashboard Section:**

```
┌──────────────────────────────────────────────┐
│  🎤 AI Interview Opportunities               │
├──────────────────────────────────────────────┤
│                                              │
│  Boost 3 applications with AI interviews     │
│                                              │
│  Your Stats:                                 │
│  • Interviews Completed: 2                   │
│  • Average Boost: +11 points                 │
│  • Practice Sessions: 5                      │
│                                              │
│  [Schedule Interview] [Practice Mode]        │
│                                              │
└──────────────────────────────────────────────┘
```

---

Epic 3 stories complete when all DoD items verified and AI interview flow tested end-to-end.
