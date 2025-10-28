# OAuth Providers Integration - Google & GitHub Login with Role Mapping

## User Story

As an authenticated platform user,
I want to sign in using Google or GitHub in addition to credentials,
So that I have a frictionless, secure login experience and automatic baseline role assignment.

## Story Context

- Extends existing NextAuth credentials-based auth.
- Introduces OAuth providers (Google, GitHub) with environment-driven configuration.
- Role mapping logic: first external user may get elevated role if no admins exist (configurable); otherwise gets USER role.
- Must preserve existing session shape (roles, id) and integrate seamlessly with tRPC `isAuthed` middleware.
- Registration page remains; login page augmented with social buttons.

## Acceptance Criteria

1. Google OAuth login succeeds: user redirected to app, session contains `user.email`, `user.id`, `roles`.
2. GitHub OAuth login succeeds: primary email resolved; if no email available, user sees actionable error prompting credential signup.
3. Environment variables documented & validated at startup: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, optional `AUTO_ELEVATE_FIRST_OAUTH_ADMIN` (boolean, default false).
4. Security: NextAuth state/PKCE protections active; simulated tampered `state` param results in graceful failure (error message, no session created).
5. Role mapping: On first successful OAuth login and when `AUTO_ELEVATE_FIRST_OAUTH_ADMIN=true` and no existing ADMIN user, assign `ADMIN` role atomically.
6. All subsequent OAuth logins assign default `USER` role unless user already has roles persisted.
7. Existing credentials flow completely unaffected (regression test passes).
8. Login page shows Google & GitHub buttons with accessible aria-labels, loading state, and distinguishes provider failure via `?error=` query.
9. Error cases covered with friendly messages: missing provider config, denied consent, missing email, duplicate linking attempt.
10. Duplicate linking: if an email already exists, user linked to existing account; no duplicate record created (verified via repository mock tests).
11. Idempotency: Repeated OAuth login does not create new user documents or duplicate roles.
12. Documentation updated (README auth section + `.env.example`) enumerating new vars & sample usage.
13. Logging: Single event `auth_login_provider` with fields `{ provider, userId (truncated), roles, newUser:boolean }`; no tokens/emails beyond what's necessary.
14. Privacy: No raw OAuth access/refresh tokens written to logs.
15. tRPC `auth.me` returns roles for both Google and GitHub sessions (integration test).
16. Type safety: Session and token callback strongly typed (no `any`); provider payload normalization typed.
17. Lint, typecheck pass; test coverage includes at least: role assignment, missing email path, linking existing user, first-admin elevation, error propagation.
18. Minimum test set: 8 distinct test cases (see Testing Strategy) all green.

## Non-Functional / Quality

- Strict TypeScript typing for session and token enhancements.
- No increase in cold-start beyond adding providers (< minimal import footprint).
- Logging only high-level events (auth_login_provider) with provider name, anonymized user id.
- Maintains privacy: no raw OAuth tokens in logs; hashed or truncated identifiers when necessary.

## Technical Notes

- Update `env.ts` schema: add optional provider secrets & `AUTO_ELEVATE_FIRST_OAUTH_ADMIN` with default false.
- Add providers in `authOptions`: GoogleProvider, GitHubProvider; ensure conditional inclusion only when vars present (to allow partial config).
- Introduce `linkOrCreateOAuthUser(profile, provider)` helper: handles email normalization (toLowerCase), existing lookup, create if absent, role elevation logic.
- Atomic first-admin elevation: use `findOneAndUpdate` with filter on `{ roles: 'ADMIN' }` absence (or count query) before assigning elevated role to prevent race; fallback to USER on collision.
- GitHub email fetch: if `profile.email` null, attempt secondary endpoint (optional future enhancement—mock skipped in tests); currently error out with guidance.
- Normalize provider user shape into internal `OAuthNormalizedProfile` interface.
- Extend JWT & session callbacks to include `roles` & `provider` tag (optional) without leaking extraneous provider fields.
- Add login buttons using `next-auth/react` `signIn(provider)`; show inline errors from `error` query (map NextAuth error codes to messages).
- Logging via existing `logger` with level `info` only.
- Potential future: Cache provider avatar; currently omit to minimize PII.

## Risks & Mitigations

| Risk                      | Mitigation                                                        |
| ------------------------- | ----------------------------------------------------------------- |
| Missing email from GitHub | Fallback error prompt directing credential signup                 |
| First-user elevation race | Atomic check + creation using Mongo unique index on email         |
| Provider secrets leaked   | Restrict to server environment variables; never log secret values |
| Session role mismatch     | Centralize role assignment inside one function with tests         |

## Definition of Done

- [ ] Providers added & conditionally configured (Google, GitHub)
- [ ] Env schema & `.env.example` updated + validated at runtime
- [ ] `linkOrCreateOAuthUser` helper implemented & unit tested
- [ ] Atomic first-admin elevation logic implemented & tested
- [ ] JWT/session callbacks extended & fully typed
- [ ] OAuth user linking prevents duplicates (tested)
- [ ] Login UI shows provider buttons + error mapping
- [ ] Error messages accessible & documented
- [ ] Test suite: minimum 8 cases passing (role elevation, duplicate linking, missing email, provider absent, google flow, github flow, auth.me with OAuth, idempotent repeat login)
- [ ] README updated (auth section)
- [ ] Logging events implemented without sensitive data
- [ ] Lint & typecheck pass
- [ ] All tests green

## Tasks / Subtasks Checkboxes

- [x] Extend env schema & `.env.example`
  - [x] Add provider secrets & validation for optional presence
  - [x] Add AUTO_ELEVATE_FIRST_OAUTH_ADMIN flag
- [x] Add providers to `authOptions` (conditional inclusion)
- [x] Implement `linkOrCreateOAuthUser` service helper
  - [ ] Email normalization & existing user lookup
  - [ ] Atomic first-admin elevation branch
- [x] Update user repository (ensure index on `email` if not present)
- [x] Enhance session & JWT callbacks (roles, provider tag)
- [ ] Update login page UI (buttons, loading, error mapping)
- [ ] Implement OAuth error state handling (query param mapping)
- [x] Add unit tests (helper, elevation logic, linking idempotency)
- [ ] Add integration tests (mock provider signIn flows)
- [ ] Add tRPC `auth.me` test with mocked OAuth session
- [ ] Update README docs (auth section + examples)
- [ ] Update `.env.example` with new keys & comments
- [ ] Add logging (provider login events)
- [ ] Final validation (lint, typecheck, tests)

## Testing Strategy

- Mock NextAuth provider callback to simulate Google/GitHub profile.
- Use in-memory mocks for user repository.
- Verify first OAuth user gets ADMIN only when configured.
- Ensure subsequent users remain USER.
- Simulate missing email case returns error result.

## Completion Criteria

All Acceptance Criteria satisfied; DoD tasks checked; tests & quality gates pass; story status can move to Ready for Review.

## Dev Agent Record

### Tasks / Subtasks Checkboxes

- [x] Extend env schema & `.env.example`
- [x] Add providers to `authOptions`
- [x] Implement `linkOrCreateOAuthUser` service
- [x] Add `AUTO_ELEVATE_FIRST_OAUTH_ADMIN` logic
- [ ] Update user repository if needed (index / helper)
- [x] Enhance session & jwt callbacks for provider source tagging
- [ ] Update login page UI (provider buttons)
- [ ] Handle OAuth error states in UI
- [x] Add tests for role mapping & user linking
- [ ] Add tests for tRPC `auth.me` with OAuth session
- [ ] Update README docs (auth section)
- [ ] Update `.env.example`
- [ ] Add logging (provider login events)
- [ ] Final validation (lint, typecheck, tests)

### Agent Model Used

Pending

### Debug Log References

Pending

### Completion Notes List

Pending

### File List

Pending

### Change Log

Pending

### Status

Draft
