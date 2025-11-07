# EP5-S12: Accessibility & Privacy Foundations

As a diverse user base,
I want an accessible interview experience that protects my personal data,
So that I can participate comfortably and securely.

## Scope

- ARIA live regions for status updates (speaking state, recording status)
- Keyboard controls (Space pause/resume, Esc end confirmation)
- High contrast mode compatibility
- Minimal PII retention in session artifacts (hash fragments for context)
- Privacy notice link in pre-start modal

## Acceptance Criteria

1. Screen reader announces interview start, new questions, recording status changes
2. All interactive controls focusable & keyboard operable
3. Color contrast passes WCAG AA (key components)
4. Raw resume/job text not stored in question events (only fragment IDs/hashes)
5. Privacy notice accessible before granting permissions

## Tests

- Manual: screen reader (VoiceOver) basic flow
- Automated: axe checks on page load

## Definition of Done

Accessible baseline & privacy protections established.
