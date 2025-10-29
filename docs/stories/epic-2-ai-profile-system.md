# Epic 2: AI-Powered Profile System – User Stories

Source: `docs/prd.md` Epic 2. IDs use EP2-S#.

## EP2-S1 Resume Upload & File Processing

As a job seeker,
I want to upload my resume (PDF/DOC) safely,
So that profile creation is fast.

Acceptance Criteria:

- Accept PDF/DOC up to 10MB
- Drag & drop + file selector
- Size/type validation + virus scan stub
- Progress indicator + cancel
- Secure storage with unique id & metadata
- Replace previous resume (version maintained)
- Clear error messages

DoD:

- [x] Upload route + component
- [x] Validation utility tests
- [x] Storage abstraction (local fs provider)
- [x] Metadata persistence

## EP2-S2 AI Resume Data Extraction

As a job seeker,
I want AI to parse resume into structured profile,
So that I avoid manual data entry.

Acceptance Criteria:

- Extract: summary, skills, experience timeline, education
- Normalize skills (mapping variations)
- Retry logic for transient OpenAI failures
- Cost guard (<$0.30 per resume) with usage counter
- Status updates (Queued → Processing → Complete / Error)

DoD:

- [ ] Extraction service w/ OpenAI client
- [ ] Skill normalization map tests
- [ ] Retry & backoff helper
- [ ] Cost tracking stub

## EP2-S3 Unified Profile Editing & Foundation (Merged from EP1-S6)

As a job seeker,
I want to refine AI-extracted data and manage core profile fields (avatar, privacy, basic info),
So that I maintain an accurate, complete, and personalized profile without redundant flows.

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

DoD:

- [ ] Editing UI + diff view
- [ ] Versioning schema & rollback helper
- [ ] Auto-save debounce tests
- [ ] Completeness calculation utility (weighted fields)
- [ ] Avatar storage adapter (local dev) + mime validation tests
- [ ] Privacy flag persisted & respected in recommendation queries
- [ ] Accessibility audit (labels, focus order)

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

Acceptance Criteria:

- Algorithm weights: 40% semantic, 35% skills, 15% experience, 10% factors
- Cosine similarity for semantic
- Skills alignment includes proficiency & recency weighting
- <500ms single score calculation target
- Batch scoring supported

DoD:

- [ ] Scoring service module
- [ ] Unit tests for each factor component
- [ ] Performance benchmark (mock data)

## EP2-S6 Detailed Score Breakdown & Feedback

As a job seeker,
I want score explanations & improvement tips,
So that I can enhance my profile.

Acceptance Criteria:

- Component scores displayed
- Strengths & improvement sections
- Missing skills list
- Actionable recommendations
- Historical tracking baseline

DoD:

- [ ] Breakdown API response shape
- [ ] Recommendation generator stub
- [ ] UI visualizations (bars, tags)

## EP2-S7 Job Recommendation Engine

As a job seeker,
I want personalized job suggestions,
So that I discover relevant opportunities.

Acceptance Criteria:

- High-score + diversity mix
- Freshness weighting
- Feedback loop (like/dislike) influences future suggestions
- Daily refresh batch

DoD:

- [ ] Recommendation service
- [ ] Feedback endpoint & persistence
- [ ] Ranking tests

## EP2-S8 Enhanced Profile Dashboard

As a job seeker,
I want a dashboard of strengths, gaps, and progress,
So that I can plan improvements.

Acceptance Criteria:

- Profile strength indicator
- Skills analysis (top, emerging, gaps)
- Match score distribution chart
- Suggestions for optimization
- Comparison vs similar candidates (anonymized)

DoD:

- [ ] Dashboard data aggregator
- [ ] Visualization components
- [ ] Comparison logic stub

---

Epic 2 stories complete when all DoD items and performance constraints verified.
