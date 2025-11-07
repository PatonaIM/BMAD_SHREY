# Epic 1: Foundation & Core Platform – User Stories

Source: See `docs/prd.md` (Epic 1 section). Story IDs use prefix EP1-S#.

**MAJOR UPDATE (2025-10-29):** Epic 1 pivoted to Workable ATS integration approach. Manual job posting removed (old EP1-S5). New focus on SEO-optimized homepage, Workable API sync, and candidate dashboard with application tracking.

## EP1-S1 Project Setup & Dev Environment

As a developer,
I want a fully configured Next.js + TypeScript + MUI project with quality/tooling,
So that I can build features rapidly with consistent standards.

Acceptance Criteria:

- Next.js 15+ App Router + TS strict configured with SSR enabled
- MUI theme with brand colors (#A16AE8, #8096FD)
- ESLint + Prettier + Husky pre-commit hooks fire on staged files
- Vitest configured with sample tests passing
- MongoDB connection helper with env validation
- Vercel deployment pipeline running typecheck + tests
- Environment configuration for Workable API and OpenAI API keys
- Coding standards doc referenced in README

Definition of Done Checklist:

- [x] Repo initialized with baseline scaffolding
- [x] Theme object exported and used in providers (MUI theme configured with brand colors)
- [x] Husky + lint-staged configured (package.json setup complete)
- [x] Sample test + coverage threshold placeholder (tests exist; coverage threshold not yet enforced)
- [x] Env schema validates required vars (`src/config/env.ts` implemented)
- [x] README updated (setup & scripts present)
- [x] CI handled by Vercel (lint, typecheck, tests run on deployment; GitHub Actions removed)
- [x] Workable API and OpenAI API env vars added and validated

## EP1-S2 Multi-Provider Authentication

As a job seeker,
I want to register/login with email/password, Google, or GitHub,
So that I can access features easily and apply to jobs.

Acceptance Criteria:

- NextAuth credentials + Google + GitHub (conditional on env vars)
- Auto-linking existing account by email
- Default role assignment: CANDIDATE
- Password >= 8 chars validated client & server
- Friendly error mapping (invalid creds, access denied, provider error)
- Session persists across refresh & days (configurable maxAge)
- Logout clears session
- JWT includes roles; session callback exposes roles
- Authentication modal/page triggered when clicking "Apply" on jobs while not logged in

DoD:

- [x] Providers implemented conditionally (Google/GitHub via env checks)
- [x] Registration endpoint + tRPC mutation (implemented; UI present)
- [x] Role persisted; test for elevation disabled by default (elevation behind flag)
- [x] Error mapping documented (login page & README auth section)
- [x] Unit tests: registration, login success, failure, provider linking (see auth tests)
- [x] README auth section updated
- [x] Auth modal/trigger on apply action for anonymous users

## EP1-S3 SEO-Optimized Public Homepage

As a job seeker or search engine crawler,
I want a fast, SEO-optimized homepage with public job listings and search,
So that I can discover relevant jobs through search engines without registration.

Acceptance Criteria:

- Server-side rendered homepage with <3 second initial load
- Futuristic modern design with prominent header navigation and footer
- Hero section with value proposition, CTA, and engaging visuals
- Job listings in card layout (title, company, location, salary, date)
- Search form with keyword input and filters (location, experience level)
- "Apply Now" button on each job card triggers auth for anonymous users
- Semantic HTML5 markup with proper heading hierarchy and ARIA labels
- JSON-LD structured data for JobPosting schema on each job
- Optimized meta tags (title, description, Open Graph, Twitter Cards)
- Dynamic sitemap.xml generated and updated daily
- robots.txt configured for search engine crawling
- Responsive design (mobile, tablet, desktop)

DoD:

- [x] Homepage route created with SSR enabled ✅
- [x] Hero section with value prop and CTA implemented (Apply gating via modal) ✅
- [x] Job cards displayed from database with real data ✅
- [x] Search form functional (keyword, location, experience filters) ✅
- [x] JSON-LD JobPosting structured data added to each job ✅
- [x] Meta tags optimized for SEO and social sharing ✅
- [x] Sitemap generation implemented ✅
- [x] robots.txt configured ✅
- [x] Responsive design working (manual verification confirmed) ✅
- [ ] Performance <3s validated with Lighthouse (pending measurement – moved to Follow-Up Epic)
- [ ] Accessibility audit passed (WCAG 2.1 AA – moved)

**Completion Status:** ✅ **85% Complete** (Updated Nov 7, 2025)

## EP1-S4 Workable API Integration

As a system administrator,
I want automatic job synchronization from Workable ATS,
So that recruiters don't need to manually post jobs.

Acceptance Criteria:

- Workable API client configured with authentication (API key/subdomain)
- Cron job/scheduled task fetches jobs every 15 minutes
- Job data mapped from Workable schema to internal MongoDB schema
- New jobs automatically created with active status
- Existing jobs updated when Workable data changes
- Jobs marked inactive/archived when removed/closed in Workable
- Error handling and retry logic with logging
- Rate limit handling respects Workable constraints
- Admin interface shows last sync time and status
- Webhook support (optional) for real-time updates

DoD:

- [x] Workable API client implemented with auth ✅
- [x] Job schema mapping from Workable to MongoDB ✅
- [x] Create/update/archive logic implemented (archive state mapped) ✅
- [x] Admin page showing sync status ✅
- [x] Sync service with retry logic and error handling ✅
- [x] Cron endpoint created (`/api/workable/cron-sync`) ✅
- [ ] Scheduled job sync task (cron or Vercel cron) – needs vercel.json configuration
- [ ] Rate limiting handled gracefully – moved
- [ ] Unit tests for API client and sync logic – moved
- [ ] Documentation for Workable setup – moved

**Completion Status:** ✅ **70% Complete** (Updated Nov 7, 2025)

## EP1-S5 Candidate Dashboard & Application Tracking

As an authenticated job seeker,
I want a unified dashboard showing my application status and available jobs,
So that I can track progress and discover opportunities in one place.

**UPDATED for Simplified Candidate Flow:** Dashboard now serves as central hub showing profile completeness, application scores, AI interview opportunities, and personalized job suggestions.

Acceptance Criteria:

- Post-login dashboard displays applications with status badges
- Application cards show job title, company, date, status, match score (with visual indicators)
- Activity timeline shows recent actions (submitted, status changed, interview)
- "Available Jobs" section displays personalized recommendations with match scores
- Quick apply button on job cards for authenticated users
- Application detail view accessible by clicking cards
- Dashboard responsive on all device sizes
- Empty states with helpful messages when no applications
- Navigation between dashboard, profile, jobs seamless
- Real-time or near real-time status updates
- **NEW:** Profile completeness widget with score and recommendations
- **NEW:** Quick actions section (Complete Profile, Take AI Interview, Update Resume)
- **NEW:** Match scores displayed on all application cards
- **NEW:** "Boost Score" prompts for applications with 60-85% match

DoD:

- [x] Dashboard route created (protected, requires auth)
- [x] Applications section with cards and status badges
- [x] Activity timeline component implemented (per-application level)
- [x] Available jobs section with job cards
- [x] Application detail view with timeline
- [x] Quick apply functionality (Apply buttons visible for authenticated users)
- [ ] Responsive design tested – moved
- [x] Empty states designed and implemented
- [ ] Navigation flow tested – moved
- [ ] Unit tests for dashboard components – moved
- [x] **NEW:** Profile completeness card integrated
- [x] **NEW:** Quick actions widget with contextual CTAs
- [x] **NEW:** Match scores shown on application cards
- [x] **NEW:** Match distribution chart widget
- [x] **NEW:** Skills gap analysis widget
- [ ] **NEW:** AI interview boost prompts for eligible applications

## EP1-S6 Responsive Application Layout

As a user,
I want a professional responsive layout with header and footer,
So that I can navigate on any device.

Acceptance Criteria:

- Layout with header (branding, nav, auth state) and footer (links, social)
- Responsive breakpoints (mobile, tablet, desktop) verified
- Navigation links: Home (public), Dashboard/Profile (authed)
- Skeletons for data fetch states
- WCAG keyboard navigation for header & menu
- Color contrast >= 4.5:1 for text

DoD:

- [x] Layout component created (AppLayout with responsive navigation)
- [x] Layout integrated globally in root layout
- [x] Footer component with company info and links
- [ ] Responsive tests (mobile + desktop snapshots) – moved
- [ ] Accessibility lint (aria, contrast) passed – moved
- [ ] Documentation of layout usage – moved

## EP1-S7 Database Schema & API Foundation

As a developer,
I want structured collections & validated endpoints for Workable and applications,
So that future features build on solid data.

Acceptance Criteria:

- Collections: users, jobs (from Workable), profiles, applications
- Jobs collection includes Workable job ID and sync timestamp
- Applications collection with userId, jobId, status, timeline, match score
- Indexes: users.email, jobs.workableId, jobs.status+postedAt, applications.userId+jobId
- Central zod validation per payload
- tRPC procedures for job queries, application submission, profile management
- Error formatting standardized
- Audit logging stub for critical actions

DoD:

- [x] Job schema with Workable fields defined
- [x] Application schema with status workflow
- [x] User and Profile schemas documented (types exist in src/shared/types/)
- [x] Database indexes created for common queries
- [x] tRPC procedures for jobs (jobs router implemented)
- [ ] tRPC procedures for applications – moved
- [x] Unit tests for repositories (auth tests cover userRepo; passwordResetRepo tested)
- [ ] Audit log interface (no-op impl) – enhancement moved

## EP1-S8 Security & Performance Baseline

As a platform administrator,
I want security/performance safeguards,
So that user data remains safe and UX is fast.

Acceptance Criteria:

- Rate limiting (basic in-memory for MVP) on auth & key endpoints
- Secure headers (CSP minimal, HSTS dev optional)
- Input sanitization for rich text fields
- Basic monitoring hook (Sentry integration placeholder)
- Image optimization (Next.js <Image />)

DoD:

- [x] Middleware for rate limit (password reset flow in-memory limiter implemented)
- [x] Security header config documented (implemented in next.config.js)
- [x] Sentry DSN wiring (sentry.client.config.ts and sentry.server.config.ts created)
- [x] Lint + typecheck + tests all pass (password reset test improvements scheduled in follow-up)
- [ ] Broader endpoint rate limiting, retry/backoff strategies – moved
- [ ] Image optimization with <Image /> – moved
- [ ] Formal sanitization audit (existing custom sanitizers present) – moved

---

Story set for Epic 1 complete once all DoD checkboxes cleared and cross-referenced in PRD updates.

### Epic 1 Completion Status

Core functional objectives delivered (setup, auth, SEO homepage, Workable sync foundation, dashboard basics, layout, schema, baseline security). Remaining unchecked items have been migrated to a follow-up hardening epic to avoid blocking progression to Epic 2.

See new follow-up epic: `epic-1-follow-up-hardening.md` for the migrated tasks.

---

## EP1-S9: Enhanced Dashboard with Profile Widgets (NEW - Simplified Flow)

As a job seeker,
I want my dashboard to show profile completeness and optimization opportunities,
So that I know exactly what to do to improve my chances.

**Purpose:** Implements steps 7-11 of the simplified candidate flow, providing visibility into profile strength, application scores, and improvement opportunities.

Acceptance Criteria:

- Profile completeness card with score (0-100) and visual indicator
- Completeness breakdown showing section scores (summary, skills, experience, education)
- Recommendations list with actionable items (e.g., "Add 3 more skills", "Complete education section")
- Quick actions widget with contextual CTAs:
  - "Complete Profile" (if <85% complete)
  - "Upload Resume" (if no resume)
  - "Take AI Interview" (if eligible applications exist)
  - "Update Skills" (if skill gaps detected)
- Skills gap widget showing missing skills from top jobs
- Match distribution visualization (how candidate compares across all jobs)
- Responsive design on mobile, tablet, desktop
- Real-time updates when profile changes

DoD:

- [x] ProfileCompletenessCard component created
- [x] QuickActionsWidget component with dynamic CTAs
- [x] SkillsGapWidget component (shows top 5 missing skills)
- [x] MatchDistributionChart component (simple bar/pie chart)
- [x] Dashboard layout updated to include new widgets
- [x] Integration with completenessScoring service
- [x] Integration with job matching service for skill gaps
- [ ] Responsive CSS/Tailwind classes verified (needs testing)
- [ ] Unit tests for all new components
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
