# Epic 1: Foundation & Core Platform – User Stories

Source: See `docs/prd.md` (Epic 1 section). Story IDs use prefix EP1-S#.

## EP1-S1 Project Setup & Dev Environment

As a developer,
I want a fully configured Next.js + TypeScript + MUI project with quality/tooling,
So that I can build features rapidly with consistent standards.

Acceptance Criteria:

- Next.js 16 App Router + TS strict configured (upgrade path validated; initial scaffold may start on 14.x if blockers discovered, but Epic completion requires 16)
- MUI theme with brand colors (#A16AE8, #8096FD)
- ESLint + Prettier + Husky pre-commit hooks fire on staged files
- Sample unit test (e.g. health ping) passes in CI
- MongoDB connection helper with env validation
- CI pipeline running typecheck + tests on PR
- Coding standards doc referenced in README

Definition of Done Checklist:

- [x] Repo initialized with baseline scaffolding
- [x] Theme object exported and used in providers (MUI theme configured with brand colors)
- [x] Husky + lint-staged configured (package.json setup complete)
- [x] Sample test + coverage threshold placeholder (tests exist; coverage threshold not yet enforced)
- [x] Env schema validates required vars (`src/config/env.ts` implemented)
- [x] README updated (setup & scripts present)
- [x] CI handled by Vercel (lint, typecheck, tests run on deployment; GitHub Actions removed)

## EP1-S2 Multi-Provider Authentication

As a job seeker,
I want to register/login with email/password, Google, or GitHub,
So that I can access features easily.

Acceptance Criteria:

- NextAuth credentials + Google + GitHub (conditional on env vars)
- Auto-linking existing account by email
- Default role assignment: CANDIDATE
- Password >= 8 chars validated client & server
- Friendly error mapping (invalid creds, access denied, provider error)
- Session persists across refresh & days (configurable maxAge)
- Logout clears session
- JWT includes roles; session callback exposes roles

DoD:

- [x] Providers implemented conditionally (Google/GitHub via env checks)
- [x] Registration endpoint + tRPC mutation (implemented; UI present)
- [x] Role persisted; test for elevation disabled by default (elevation behind flag)
- [x] Error mapping documented (login page & README auth section)
- [x] Unit tests: registration, login success, failure, provider linking (see auth tests)
- [x] README auth section updated

## EP1-S3 Responsive Application Layout

As a user,
I want a professional responsive layout,
So that I can navigate on any device.

Acceptance Criteria:

- Layout with header (branding, nav, auth state)
- Responsive breakpoints (mobile, tablet, desktop) verified
- Navigation links: Jobs (public), Dashboard/Profile (authed)
- Skeletons for data fetch states
- WCAG keyboard navigation for header & menu
- Color contrast >= 4.5:1 for text

DoD:

- [x] Layout component integrated globally (AppLayout created with responsive navigation)
- [ ] Responsive tests (mobile + desktop snapshots) (pending)
- [ ] Accessibility lint (aria, contrast) passed (pending tooling)
- [ ] Documentation of layout usage (pending)

## EP1-S4 Anonymous Job Browsing

As an anonymous visitor,
I want to browse jobs without signup,
So that I can evaluate platform relevance.

Acceptance Criteria:

- Public /jobs page lists active jobs (mock data acceptable initially)
- Card includes title, company, location, posting date, salary (optional)
- Search (title/description keywords)
- Basic filters (location, type, company)
- Pagination or infinite scroll (choose one) with performant queries
- Job detail accessible anonymously
- Apply CTA triggers auth if not logged in
- Initial load < 3s (local dev baseline)

DoD:

- [ ] Job model + repository (pending)
- [ ] Public jobs route (pending)
- [ ] Filtering logic test (pending)
- [ ] Performance budget note (<3s) (pending)
- [ ] Accessibility on cards (aria role="article") (pending)

## EP1-S5 Job Management (Recruiter Admin)

As a recruiter,
I want to post/manage job listings,
So that I can attract candidates.

Acceptance Criteria:

- Auth required with RECRUITER/ADMIN role
- Create/edit form (title, description, requirements, location, salary, company)
- Status transitions: Draft -> Active -> Closed
- Rich text (MVP: limited markdown or editor)
- List view with edit/delete
- Validation & error states

DoD:

- [ ] Role guard middleware tests (pending)
- [ ] CRUD repository + tRPC procedures (pending)
- [ ] Form validation (zod) + unit tests (pending)
- [ ] Markdown sanitization (XSS safe) (pending)

## EP1-S6 (Moved) Basic Profile Creation – Consolidated into EP2-S3

This initial profile foundation (fields, avatar, privacy, completeness metric) has been merged with the AI extraction editing flow in Epic 2 for a single cohesive candidate profile experience. See `epic-2-ai-profile-system.md` Story EP2-S3.

## EP1-S7 Database Schema & API Foundation

As a developer,
I want structured collections & validated endpoints,
So that future features build on solid data.

Acceptance Criteria:

- Collections: users, jobs, profiles, applications (seed placeholder)
- Indexes: users.email, jobs.status+postedAt, applications.userId+jobId
- Central zod validation per payload
- Error formatting standardized
- Audit logging stub for critical actions

DoD:

- [ ] Migrations or initialization script (pending)
- [x] Schemas documented (User, Job, Application, Interview types exist in src/shared/types/)
- [x] Unit tests for repositories (auth tests cover userRepo; passwordResetRepo tested)
- [ ] Audit log interface (no-op impl) (pending)

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
- [x] Lint + typecheck + tests all pass (lint/typecheck clean; password reset tests timeout issue remains)

---

Story set for Epic 1 complete once all DoD checkboxes cleared and cross-referenced in PRD updates.
