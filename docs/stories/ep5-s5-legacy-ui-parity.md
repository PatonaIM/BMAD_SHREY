# EP5-S5: Legacy Interview Page Look & Feel Parity (Modernized)

## Goal

Bring forward the core visual identity, layout structure, and interaction affordances of the legacy Interview Page into the new Interview V2 realtime architecture while allowing minor modernization (accessibility, responsiveness, dark mode consistency, performance).

## Context

Interview V2 introduced WebRTC realtime, adaptive questioning, scoring, and composite recording. The existing legacy interface (split panel: video preview + AI panel + helper panel; header status bar with timer & progress; vivid status badges & action buttons) established user familiarity. We must reduce cognitive friction by preserving recognizable patterns while integrating new capabilities.

## In-Scope

- Header status bar styling parity (connection status pill, timer, question progress grouping)
- Split panel layout proportions (≈60% left media + AI panel, 40% right helper) responsive down to mobile (stacked vertical)
- Primary action buttons (Start / End) retain color semantics (green start, red end), updated wording if needed
- Status + badges visual style (rounded pills, subtle gradients / soft backgrounds) preserved
- Video preview container framing (rounded corners, subtle shadow, dark background)
- Helper panel structural placement & scroll behavior
- AI speaking animation retained (size adjustable for layout harmony)

## Modernization Allowed (Minor Enhancements)

- Replace tailwind ad-hoc color mix with design tokens (centralized CSS vars) for dark mode consistency
- Improve focus-visible outlines & button accessible names
- Reduce excessive shadow layers for performance
- Semantic landmarks (header / main / aside) for a11y
- Prefetch candidate-specific assets lazily

## Out of Scope (Future Stories)

- Full theming overhaul
- Advanced animation rework (Framer Motion sequences)
- AI coaching side panel expansions
- Internationalization of interview UI

## Acceptance Criteria

1. Header contains status pill, timer, question progress, visually near-parity to legacy (font size ±1px variance acceptable).
2. Layout maintains split (desktop ≥1024px: left column ~60%, right ~40%; mobile stacks with video preview first).
3. Start / End buttons use legacy color semantics (#10B981 green, #EF4444 red) with hover states and focus-visible rings.
4. Video preview retains rounded-xl, border, dark background, responsive aspect ratio.
5. AI Interview panel gradient background updated but not drastically different; speaking animation centered, label text present.
6. Helper panel positioned right (or below on mobile) and scrollable independently without layout shift.
7. All interactive elements have accessible names and focus indicators (WCAG AA minimum).
8. Dark mode styles applied consistently for header, panels, buttons.
9. No hydration mismatches introduced; initial render stable.
10. Lighthouse performance: added UI changes do not increase total blocking time >5% compared to pre-change baseline (soft target).

## Risks & Mitigations

| Risk                                | Impact               | Mitigation                                                                    |
| ----------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Tailwind class drift                | Visual inconsistency | Create small token map / utility classes for reused styles                    |
| Hydration mismatch (dynamic values) | Flicker              | Avoid random/time-based content in SSR; keep client-only dynamic labels gated |
| Over-modernization                  | User confusion       | Limit changes to minor polish; document in change log                         |
| Mobile overflow issues              | Broken UX            | Test at 375px width; enforce min-h-0 and flex overflow patterns               |

## Implementation Plan (Phased)

1. Audit legacy components (`InterviewContainer`, `InterviewStatus`, `InterviewControls`) and record key style tokens.
2. Introduce a small `legacyTheme.ts` (or CSS module) exporting class name fragments / CSS vars.
3. Refactor new V2 container to reuse header/status components or wrap them for realtime metrics.
4. Adapt `RealtimeSessionBootstrap` to embed header region & unify action buttons.
5. Mirror split layout around new WebRTC + recorder panels.
6. Add a11y improvements (aria-labels, focus styles).
7. Visual regression manual check (screenshots side-by-side) + document deltas.
8. Performance sanity (avoid heavy gradients / expensive shadows).
9. Update story doc with completion notes & any deviations.

## Data / State Mapping

Legacy -> V2:

- connectionStatus maps to `state.phase` / `state.connectionState` (translate to status pill)
- elapsedSeconds derives from new session start timestamp (add timer hook)
- currentQuestion / totalQuestions: use `state.currentQuestionIndex + 1` and (placeholder total until engine implemented)
- aiSpeaking maps to `state.aiSpeaking` from realtime handler

## Edge Cases

- Very small viewport (<340px): stack & collapse header groups into vertical blocks.
- No remote stream yet: show skeleton video preview state.
- Permissions denied: fallback messaging uses legacy style panel.
- Interview completed: header still visible; End button removed; score displayed elsewhere.

## Testing

- Snapshot test for header component className set.
- Cypress (future) for responsive layout; current story limited to manual verification.
- A11y: axe run results no new critical issues.

## Completion Definition

All acceptance criteria satisfied, doc updated, and manual visual comparison shows high parity with ≤10% deviation in spacing or color luminance.

## Change Log (initialize)

- v0.1 Story created.

---

Pending your confirmation before implementation begins.
