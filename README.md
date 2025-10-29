# Teamified Platform

Teamified is a full-stack recruiting & candidate experience platform integrating job data from Workable, enriching listings with structured skills, and providing streamlined application & tracking features.

## 🚀 Highlights

- **Workable ATS Integration**: Scheduled sync + on-demand hydration to pull missing descriptions, requirements, benefits & inferred skills.
- **SEO-Optimized Job Pages**: Server-rendered listings with JSON-LD, clean semantic markup, pagination rel links, and canonical URLs.
- **Candidate Dashboard**: Track applications, statuses, and timelines with minimal latency via tRPC procedures.
- **Secure Authentication**: NextAuth (OAuth providers + credentials) with role-based guards and audit logging hooks.
- **Structured Logging**: Pino-based event logging for fetch, hydrate, render and auth flows.
- **Skill Extraction**: Heuristic parsing of hydrated description/requirements body to build searchable skill sets.
- **Tailwind UI**: Migrated from Material UI to Tailwind for lighter bundle, theming via utility classes, dark mode toggle, and marketing sections.

## 🧱 Architecture Overview

| Layer       | Path                                | Purpose                                                                      |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Config      | `src/config/env.ts`                 | Zod validation of required environment variables                             |
| Data Access | `src/data-access/repositories/*`    | MongoDB repositories, search & upsert logic                                  |
| Services    | `src/services/*`                    | Domain services (auth, scoring, workable sync/hydrate, email, rate limiting) |
| API         | `src/app/api/*`                     | Next.js route handlers (auth, workable, tRPC)                                |
| UI          | `src/app/**/*` + `src/components/*` | App Router pages + presentational & interactive components                   |
| Monitoring  | `src/monitoring/logger.ts`          | Structured application logging                                               |
| Shared      | `src/shared/*`                      | Cross-cutting utilities, result wrapper, error types, vector math            |

## 🌐 Workable Integration

- `sync` route: Bulk fetch active roles, upsert into MongoDB.
- `hydrate` route: Enrich incomplete jobs with missing description/requirements.
- Runtime detail fetch on individual job page retains original HTML for richer rendering while sanitizing output.

## 🎨 Styling (Tailwind Migration)

The platform migrated from MUI to Tailwind for performance and design flexibility.

| Before                               | After                                               |
| ------------------------------------ | --------------------------------------------------- |
| MUI ThemeProvider, component imports | Utility-first classes + custom `globals.css` tokens |
| Emotion runtime styling              | Purged; no CSS-in-JS at runtime                     |
| Heavy component abstraction          | Lean semantic markup with composable primitives     |

Core utilities live in `src/styles/globals.css` (buttons, cards, badges, inputs). Dark mode uses `class` strategy toggled by a custom component.

## 🔐 Authentication & Security

- NextAuth providers (GitHub, Google, credentials).
- Password reset flow with token repository and tests.
- Rate limiter middleware in `src/services/security/rateLimiter.ts` (extensible for per-IP/route windows).

## 🧪 Testing

Vitest test suites cover:

- Application & auth flows (`src/services/auth/*.test.ts`)
- tRPC router behavior (`src/services/trpc/appRouter.test.ts`)
- Scoring logic (`src/services/scoring/matchScorer.test.ts`)
- Vector utilities (`src/shared/vector.test.ts`)
- JSON-LD structure (`src/seo/jobJsonLd.test.ts`)

Python tests (if any future additions) run via `pytest` script.

## 📦 Tech Stack

- Next.js 15 (App Router)
- TypeScript strict
- MongoDB driver 6.x
- tRPC v10 + React Query
- NextAuth
- Tailwind CSS 3.x
- Pino logging
- Zod validation

## 🧪 Local Development

```bash
# Install deps
npm install

# Run dev server
npm run dev

# Typecheck
npm run typecheck

# Lint
npm run lint

# Tests
npm test
```

Environment variables required (see `src/config/env.ts`):

```
WORKABLE_API_TOKEN=
WORKABLE_SUBDOMAIN=
CRON_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 🔄 Migration Notes (MUI → Tailwind)

1. Removed MUI & Emotion dependencies from `package.json`.
2. Deleted legacy theme file `src/theme/index.ts`.
3. Rewrote all pages & components to Tailwind (see commit history for diff granularity).
4. Added marketing sections (stats, testimonials, CTA) and scroll reveal animation via lightweight IntersectionObserver.
5. Introduced skeleton primitives (`Skeletons.tsx`) for prospective streaming/Suspense usage.

## 🧯 Outstanding / Future Enhancements

- Job search skeleton integration using React Suspense streaming.
- More robust skill taxonomy & ML-based extraction.
- Candidate notification emails (currently placeholder console in `emailService.ts`).
- Rate-limiter integration with API routes & persistent store.
- E2E tests (Playwright) for application submit & password reset flows.

## 🤝 Contributing

1. Create a feature branch.
2. Add/update tests for behavior changes.
3. Ensure `npm run build` and `npm test` pass.
4. Open PR with architecture/impact summary.

## ⚖️ License

MIT

---

Happy building! 🚀
