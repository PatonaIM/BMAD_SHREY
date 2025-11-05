# EP5-S1: Permissions & Device Readiness Gate

As a candidate,
I want clear camera and microphone permission handling with diagnostics,
So that I can confidently start the interview without technical surprises.

## Scope

- Request camera+mic immediately upon page load (after minimal explainer modal)
- Display permission status (granted / denied / prompt)
- Show real-time audio level preview & camera preview frame
- Provide fallback guidance if blocked (browser / OS / device issues)
- Basic network quality indicator (ping + estimated upstream bandwidth)

## Acceptance Criteria

1. Single consolidated permission request (mediaDevices.getUserMedia)
2. Distinct UI states: awaiting, granted, denied (with retry)
3. Audio level meter updates ≥10Hz
4. Camera preview shows correct aspect ratio (16:9 target) or fallback message
5. Network test completes <3s and classifies: poor / fair / good (thresholds documented)
6. Metrics logged: permission_granted, permission_denied_reason
7. Accessibility: permission status announced via ARIA live region
8. Application page "Take AI Interview" CTA navigates to new v2 route `/interview/new/{applicationId}` (feature-flagged) instead of legacy v1 path; falls back gracefully if flag disabled.

## Non-Functional

- Handle Safari quirk (must initiate from user gesture) gracefully
- No unhandled promise rejections on permission denial
- Minimal bundle impact (<10KB added JS for diagnostics)

## Edge Cases

- User denies mic but allows camera → prompt clarify requirement
- Device has no camera → allow audio-only, mark recording metadata hasWebcam=false
- Multiple microphones → choose default; provide selection option (future)

## Tests

- Unit: permission state reducer
- Integration: denial + retry path
- Manual: Safari user gesture flow

## Definition of Done

Permission gate consistently transitions to READY state and exposes stream object for subsequent stories.
"Take AI Interview" button on application detail page opens this new page route under feature flag control.

## Implementation Notes (Routing Update)

- New route pattern: `/interview/new/[applicationId]`.
- Add feature flag `ENABLE_INTERVIEW_V2_PAGE`; if false, legacy route retained.
- Update application detail component: replace existing link href with conditional selection.
- Analytics event: `interview_v2_entry` fired when candidate lands on new page.
- Backward compatibility: if direct navigation fails (404), auto-redirect to legacy interview page and log `INT_V2_ROUTE_FALLBACK`.
