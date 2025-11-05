# EP5-S17: Conditional Device Info & Interview Feed Removal

As a candidate,
I want a clean, distraction-free interview UI after I start,
So that I can focus entirely on the conversation without unnecessary panels.

## Scope

- Hide `DevicePermissionGate` (Device Check card) after interview starts
- Remove `QuestionFeed` component entirely from the UI
- Adjust layout to utilize freed space (expand video panels or add whitespace)
- Maintain diagnostic info availability via debug toggle (optional dev-only feature)

## Acceptance Criteria

1. Device Check card visible only when `interviewPhase === 'pre_start'`
2. Card smoothly fades out when interview transitions to `intro` or `conducting`
3. Interview Feed component completely removed from codebase (no render, no logic)
4. Layout remains balanced without feed panel (no awkward gaps)
5. Diagnostics toggle (if present) still accessible for debugging
6. No console errors or warnings after removal

## UI Before & After

### Before (Current)

```
┌─────────────────────────────────────────┐
│  Header Bar                             │
├───────────────────┬─────────────────────┤
│  Video & Controls │  Sidebar:           │
│                   │  - Device Check     │
│  Interview Feed   │  - Score Card       │
│                   │  - Diagnostics      │
└───────────────────┴─────────────────────┘
```

### After (Target)

```
┌─────────────────────────────────────────┐
│  Header Bar                             │
├───────────────────┬─────────────────────┤
│  Video Split View │  Sidebar:           │
│  (Candidate | AI) │  - Score Card       │
│                   │  - Diagnostics      │
│                   │                     │
└───────────────────┴─────────────────────┘
```

**Note**: Device Check appears only during `pre_start` phase.

## Technical Approach

### 1. Conditional Device Check Rendering

```typescript
// In ModernInterviewPage.tsx
<aside className="space-y-6">
  {phase === 'pre_start' && (
    <PermissionCard applicationId={applicationId} />
  )}
  <ScoreCard controller={controller} />
  <DiagnosticsToggle ... />
</aside>
```

### 2. Remove Interview Feed Component

- Delete `<QuestionFeed>` from render tree
- Remove `QuestionFeed` component definition
- Remove `scrollRef` and auto-scroll logic
- Clean up feed-related state in `useInterviewController` (optional: keep for logging)

### 3. Layout Adjustment

Option A: **Expand Video Panels**

- Increase video container height to fill space previously used by feed
- Adjust grid layout: `lg:col-span-2` → `lg:col-span-3` for video section

Option B: **Add Whitespace/Instructions**

- Replace feed with static "Interview in Progress" message
- Show live timer or question count in compact format

**Recommendation**: Option A (expand video for better visibility)

## Feed Data Preservation

Although the UI component is removed, feed events may still be useful for:

- Backend logging/analytics
- Post-interview review (admin dashboard)
- Debug mode diagnostics

**Solution**: Keep `pushFeed()` logic in `useInterviewController`, but don't render. Add optional dev-only panel:

```typescript
{process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1' && (
  <details className="mt-4 text-xs">
    <summary>Feed Log (Debug)</summary>
    <pre>{JSON.stringify(controller.feed, null, 2)}</pre>
  </details>
)}
```

## Transition Animation

Add smooth fade-out for Device Check card:

```tsx
<div
  className={`transition-opacity duration-500 ${
    phase === 'pre_start' ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`}
>
  <PermissionCard applicationId={applicationId} />
</div>
```

After fade completes, remove from DOM entirely (prevents layout shift).

## Edge Cases

- User refreshes page during interview → Device Check should not reappear
- Interview errors out → Device Check may reappear if state resets to `pre_start`
- Admin viewing as observer → May want persistent feed view (future feature flag)

## Accessibility

- Announce Device Check dismissal via ARIA live region: "Device check complete, interview started"
- Ensure focus moves to appropriate element after card removal (e.g., video panel)

## Tests

- Unit: Conditional rendering based on `interviewPhase`
- Visual: Verify layout with/without Device Check card
- Integration: Start interview, confirm card disappears within 500ms

## Definition of Done

Device Check card visible only during pre-start phase, disappears smoothly after start. Interview Feed component removed from UI entirely. Layout remains balanced. Feed data still logged internally for debugging/analytics.

## Tasks

- [ ] Add conditional rendering for Device Check based on phase
- [ ] Remove `QuestionFeed` component from render tree
- [ ] Delete unused `QuestionFeed` component definition
- [ ] Remove `scrollRef` and auto-scroll useEffect
- [ ] Add fade-out transition for Device Check
- [ ] Adjust layout to fill freed space
- [ ] (Optional) Add debug-only feed log panel
- [ ] Test across all interview phases
- [ ] Verify no console errors

## Dependencies

- **Blocked by**: EP5-S14 (phase transitions must work correctly)
- **Parallel with**: EP5-S15 (layout changes don't conflict)

## Related Stories

- EP5-S14: Interview Start State Bugfix (ensures phase transitions work)
- EP5-S15: Split-Screen Layout (may need layout adjustments)
