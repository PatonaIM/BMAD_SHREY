# Epic 2: AI-Powered Profile System – User Stories

Source: `docs/prd.md` Epic 2. IDs use EP2-S#.

**UPDATED for Simplified Candidate Flow:** Epic 2 now emphasizes the streamlined journey from resume upload → extraction → profile creation → scoring, implementing steps 3-6 of the candidate flow.

## EP2-S1 Resume Upload & File Processing

As a job seeker,
I want to upload my resume (PDF/DOC) safely,
So that profile creation is fast.

**Flow Position:** Step 3 - Candidate uploads resume after deciding to apply.

Acceptance Criteria:

- Accept PDF/DOC up to 10MB
- Drag & drop + file selector
- Size/type validation + virus scan stub
- Progress indicator + cancel
- Secure storage with unique id & metadata
- Replace previous resume (version maintained)
- Clear error messages
- **NEW:** Immediately trigger extraction after successful upload
- **NEW:** Show "Processing your resume..." state

DoD:

- [x] Upload route + component
- [x] Validation utility tests
- [x] Storage abstraction (local fs provider)
- [x] Metadata persistence
- [ ] **NEW:** Auto-trigger extraction on upload success
- [ ] **NEW:** Loading state during upload/extraction

## EP2-S2 AI Resume Data Extraction

As a job seeker,
I want AI to parse resume into structured profile,
So that I avoid manual data entry.

**Flow Position:** Step 4 - System extracts resume data automatically.

Acceptance Criteria:

- Extract: summary, skills, experience timeline, education
- Normalize skills (mapping variations)
- Retry logic for transient OpenAI failures
- Cost guard (<$0.30 per resume) with usage counter
- Status updates (Queued → Processing → Complete / Error)
- **NEW:** Calculate initial profile completeness score after extraction
- **NEW:** Identify skill gaps vs. target job (if applying for specific role)

DoD:

- [ ] Extraction service w/ OpenAI client
- [ ] Skill normalization map tests
- [ ] Retry & backoff helper
- [ ] Cost tracking stub
- [ ] **NEW:** Completeness scoring integration post-extraction
- [ ] **NEW:** Skill gap analysis (if job context available)

## EP2-S3 Unified Profile Editing & Foundation (Merged from EP1-S6)

As a job seeker,
I want to refine AI-extracted data and manage core profile fields (avatar, privacy, basic info),
So that I maintain an accurate, complete, and personalized profile without redundant flows.

**Flow Position:** Step 5 - Candidate reviews and creates profile from extracted data.

**ENHANCED:** Now includes guided wizard flow for first-time profile creation with inline completeness feedback.

Acceptance Criteria:

- Editable fields for extracted entities: summary, skills, experience entries, education
- Core profile fields included: name, location, phone (optional), avatar upload (basic crop optional), privacy visibility flag
- Side-by-side original vs edited (diff indicators)
- Auto-save drafts (debounced) with user feedback (Saving… / Saved)
- Version snapshot stored per major edit session (rollback capability)
- Completeness score recalculates after edits & avatar change
- Account deletion entry point (placeholder action; confirm modal)
- Validation errors inline & accessible (aria-describedBy linked)
- Avatar upload sanitizes file type & size (<2MB) and stores optimized variant
- **NEW:** First-time wizard flow with step-by-step guidance
- **NEW:** Real-time completeness indicator showing progress
- **NEW:** Section-by-section validation with visual checkmarks
- **NEW:** "Skip for now" option with warning about score impact
- **NEW:** Celebration UI on profile completion (confetti/animation)

DoD:

- [ ] Editing UI + diff view
- [ ] Versioning schema & rollback helper
- [ ] Auto-save debounce tests
- [ ] Completeness calculation utility (weighted fields)
- [ ] Avatar storage adapter (local dev) + mime validation tests
- [ ] Privacy flag persisted & respected in recommendation queries
- [ ] Accessibility audit (labels, focus order)
- [ ] **NEW:** Wizard component with multi-step form
- [ ] **NEW:** Real-time completeness progress bar
- [ ] **NEW:** Section validation indicators
- [ ] **NEW:** Success/completion flow with redirect to dashboard

## EP2-S4 Semantic Resume Vectorization

As a developer,
I want semantic vectors for resumes,
So that matching uses meaning not just keywords.

Acceptance Criteria:

- Generate embeddings for full text (original + edited)
- Store in MongoDB Atlas Vector Search with index
- Auto re-vectorize on significant profile changes
- Retry + rate limit logic

DoD:

- [ ] Embedding task worker
- [ ] Vector storage schema + index
- [ ] Change threshold logic tests

## EP2-S5 Job-Candidate Matching Algorithm

As a job seeker,
I want transparent match scoring,
So that I can target best-fit jobs.

**Flow Position:** Step 6 - System generates match score for application.

**ENHANCED:** Scores now visible everywhere and drive candidate decisions.

Acceptance Criteria:

- Algorithm weights: 40% semantic, 35% skills, 15% experience, 10% factors
- Cosine similarity for semantic
- Skills alignment includes proficiency & recency weighting
- <500ms single score calculation target
- Batch scoring supported
- **NEW:** Scores displayed on all job cards (homepage, dashboard, search results)
- **NEW:** Color-coded badges: Red (<60%), Yellow (60-85%), Green (>85%)
- **NEW:** Cache scores to avoid recalculation on every view
- **NEW:** Recalculate when profile changes significantly

DoD:

- [ ] Scoring service module
- [ ] Unit tests for each factor component
- [ ] Performance benchmark (mock data)
- [ ] **NEW:** Score caching mechanism (Redis or in-memory for MVP)
- [ ] **NEW:** Cache invalidation on profile updates
- [ ] **NEW:** Batch scoring API for job list pages
- [ ] **NEW:** Color coding helper utility

## EP2-S6 Detailed Score Breakdown & Feedback

As a job seeker,
I want score explanations & improvement tips,
So that I can enhance my profile.

**Flow Position:** Step 9 - Candidate can complete profile to improve score.

**ENHANCED:** Now includes actionable recommendations specific to each job.

Acceptance Criteria:

- Component scores displayed
- Strengths & improvement sections
- Missing skills list
- Actionable recommendations
- Historical tracking baseline
- **NEW:** "Why this score?" modal accessible from every score badge
- **NEW:** Job-specific improvement tips (e.g., "Add React experience to improve match by 12%")
- **NEW:** Profile completeness impact shown (e.g., "Completing education section could boost score to 78%")
- **NEW:** Link to profile editor with pre-filled section focus
- **NEW:** Show similar successful candidates' profiles (anonymized)

DoD:

- [ ] Breakdown API response shape
- [ ] Recommendation generator stub
- [ ] UI visualizations (bars, tags)
- [ ] **NEW:** ScoreBreakdownModal component
- [ ] **NEW:** Job-specific recommendation engine
- [ ] **NEW:** Profile section deep-linking
- [ ] **NEW:** Similar profiles comparison (anonymized aggregates)

## EP2-S7 Job Recommendation Engine

As a job seeker,
I want personalized job suggestions,
So that I discover relevant opportunities.

**Flow Position:** Step 8 - Dashboard shows job suggestions and other open jobs.

**ENHANCED:** Recommendations now central to dashboard experience with match scores.

Acceptance Criteria:

- High-score + diversity mix
- Freshness weighting
- Feedback loop (like/dislike) influences future suggestions
- Daily refresh batch
- **NEW:** Recommendations section on dashboard with top 5-10 matches
- **NEW:** Each recommendation shows match score and reason ("Strong React skills match")
- **NEW:** "See more like this" / "Not interested" feedback buttons
- **NEW:** Filter by job type, location, remote options
- **NEW:** Email digest option (future) for weekly top matches

DoD:

- [ ] Recommendation service
- [ ] Feedback endpoint & persistence
- [ ] Ranking tests
- [ ] **NEW:** Dashboard recommendations component
- [ ] **NEW:** Match reasoning text generator
- [ ] **NEW:** Feedback collection UI + API
- [ ] **NEW:** Recommendation filters (job type, location)
- [ ] **NEW:** Email digest stub (placeholder for future)

## EP2-S8 Enhanced Profile Dashboard

As a job seeker,
I want a dashboard of strengths, gaps, and progress,
So that I can plan improvements.

**Flow Position:** Steps 8-9 - Dashboard shows completeness, scores, and improvement opportunities.

**FULLY INTEGRATED:** This story now implements the complete dashboard vision from the simplified flow.

Acceptance Criteria:

- Profile strength indicator
- Skills analysis (top, emerging, gaps)
- Match score distribution chart
- Suggestions for optimization
- Comparison vs similar candidates (anonymized)
- **NEW:** Real-time updates when profile edited
- **NEW:** Achievement badges/milestones (e.g., "Profile 90% complete!", "Applied to 10 jobs")
- **NEW:** Application success rate tracking
- **NEW:** Interview invitation rate vs. platform average
- **NEW:** Skill trend analysis (e.g., "React demand +15% this month")

DoD:

- [ ] Dashboard data aggregator
- [ ] Visualization components
- [ ] Comparison logic stub
- [ ] **NEW:** Real-time data refresh on profile changes
- [ ] **NEW:** Achievement/milestone tracking system
- [ ] **NEW:** Success rate calculation service
- [ ] **NEW:** Platform benchmark comparison
- [ ] **NEW:** Skill trend data integration (external API or manual curated)

---

## EP2-S9: Seamless Resume → Profile Creation Flow (NEW - Simplified Flow)

As a job seeker,
I want a guided flow from resume upload to profile creation,
So that I can quickly create my profile with minimal effort.

**Flow Position:** Steps 3-5 implemented as single guided journey.

**Purpose:** Eliminates friction between resume upload and profile creation, ensuring every candidate completes their profile.

Acceptance Criteria:

- After resume upload, immediately show extraction progress indicator
- Display extracted data in clean review interface
- Allow inline editing of all extracted fields without navigating away
- Calculate and display initial completeness score in real-time
- Show "What's Missing?" section with prioritized recommendations
- Auto-save all changes as user edits
- Provide "Save and Continue" / "Skip for Now" options at each step
- Redirect to dashboard on completion with success message
- Handle extraction errors gracefully with manual entry fallback
- Mobile-responsive wizard design

DoD:

- [ ] Multi-step wizard component (ResumeToProfileWizard)
- [ ] Extraction progress indicator with status messages
- [ ] Inline editing for personal info, skills, experience, education
- [ ] Completeness score calculation integration (real-time)
- [ ] Recommendation panel showing missing/weak sections
- [ ] Auto-save functionality with debouncing
- [ ] Success/completion flow with celebration UI
- [ ] Error handling for extraction failures
- [ ] Mobile responsive design
- [ ] Unit tests for wizard logic and transitions
- [ ] Integration test for full flow (upload → extract → edit → save)

**Component Structure:**

```
/profile/create/from-resume/
  ├── page.tsx (wizard container)
  ├── components/
  │   ├── UploadStep.tsx
  │   ├── ExtractionProgress.tsx
  │   ├── ReviewStep.tsx (with inline editing)
  │   ├── CompletenessCheck.tsx
  │   └── CompletionCelebration.tsx
```

---

## EP2-S10: Match Score Visibility on All Jobs (NEW - Simplified Flow)

As a job seeker,
I want to see my match score on every job listing,
So that I can prioritize which jobs to apply to.

**Flow Position:** Steps 6, 8 - Scores shown everywhere to guide decisions.

**Purpose:** Makes match scores the primary decision-making tool for candidates.

Acceptance Criteria:

- Match score badge on homepage job cards (if authenticated)
- Match score badge on dashboard "Available Jobs" section
- Match score badge on search results
- Match score badge on job detail page
- Score color coding with clear visual hierarchy:
  - Green (>85%): "Excellent Match"
  - Yellow (60-85%): "Good Match - Boost with AI Interview"
  - Red (<60%): "Improve Profile for Better Match"
- "Why this score?" clickable tooltip/icon showing breakdown
- Breakdown modal with component scores and recommendations
- Link to "Improve Score" actions (profile editor or AI interview)
- Caching/performance optimization to avoid recalculating on every view
- Loading skeleton while score calculates

DoD:

- [ ] MatchScoreBadge component (reusable)
- [ ] Score calculation triggered on job list queries
- [ ] Caching layer for calculated scores (in-memory or Redis)
- [ ] Cache invalidation on profile updates
- [ ] ScoreBreakdownModal component
- [ ] Score color helper utility
- [ ] Integration in:
  - [ ] Homepage job cards
  - [ ] Dashboard "Available Jobs"
  - [ ] Search results page
  - [ ] Job detail page
- [ ] Performance tests (batch scoring for lists)
- [ ] Loading state handling
- [ ] Unit tests for badge and modal components

**API Changes:**

```typescript
// GET /api/jobs - add ?includeScores=true param
// POST /api/jobs/batch-score - batch calculate scores for multiple jobs
```

---

Epic 2 stories complete when all DoD items and performance constraints verified.
