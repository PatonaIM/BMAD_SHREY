# EP5-S15: Split-Screen Layout Refactor (Candidate | AI Avatar)

As a candidate,
I want to see myself on the left half and the AI interviewer avatar on the right half,
So that the interview feels more natural and conversational.

## Scope

- Refactor `VideoAndControls` component to split into two equal 50/50 sections
- Left panel: Candidate's video feed (from local webcam stream)
- Right panel: AI avatar viewport (placeholder for S16 3D avatar)
- Responsive design: stack vertically on mobile (<768px)
- Remove full-width aspect-video container; replace with side-by-side grid
- **Viewport-constrained layout**: No scrolling required; all content fits within viewport height

## Acceptance Criteria

1. Desktop (≥1024px): Two side-by-side panels, each 50% width, equal height
2. Tablet (768-1023px): Two panels remain side-by-side, slightly reduced padding
3. Mobile (<768px): Stack vertically, candidate on top, AI below
4. Each panel maintains 16:9 aspect ratio or fills available height
5. Local video feed properly scaled (object-cover) without distortion
6. Right panel shows placeholder content until S16 avatar integration
7. Controls (Start/End buttons) positioned logically below split view
8. **No vertical scrolling**: Entire UI fits within viewport (`100vh`), no `overflow-y: scroll`
9. **Fixed header + footer**: Header bar and controls remain visible without scrolling
10. **Dynamic sizing**: Video panels scale proportionally based on available viewport height

## Design Specs

### Desktop Layout

```
┌─────────────────────────────────────────────────────┐
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │  Candidate Video │  │   AI Avatar      │        │
│  │  (Local Stream)  │  │   (Placeholder)  │        │
│  │                  │  │                  │        │
│  └──────────────────┘  └──────────────────┘        │
│  ┌─────────────────────────────────────────┐       │
│  │  [Start/End Interview Button]           │       │
│  └─────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout (Stacked)

```
┌─────────────────────┐
│  Candidate Video    │
│  (Local Stream)     │
└─────────────────────┘
┌─────────────────────┐
│  AI Avatar          │
│  (Placeholder)      │
└─────────────────────┘
┌─────────────────────┐
│  [Start Button]     │
└─────────────────────┘
```

## Technical Approach

1. **Viewport-based layout**: Use `h-screen` (100vh) for root container, distribute space with Flexbox
2. **Three-row structure**:
   - Row 1: Fixed-height header bar (~80-100px)
   - Row 2: Flexible video panels (fills remaining space)
   - Row 3: Fixed-height controls bar (~60-80px)
3. Replace single `aspect-video` container with CSS Grid: `grid-cols-2` (desktop) / `grid-cols-1` (mobile)
4. Each grid cell contains a video/canvas element
5. Left cell: Existing `<video ref={videoRef}>` for local stream
6. Right cell: `<div id="ai-avatar-container">` (will hold Three.js canvas in S16)
7. Use Tailwind responsive utilities: `grid-cols-1 lg:grid-cols-2`
8. Overlay labels (phase indicators) positioned absolute within video panels
9. **No scroll containers**: Remove `overflow-y-auto` from all parent elements
10. **Dynamic height calculation**: `calc(100vh - headerHeight - controlsHeight)` for video section

## Edge Cases

- Ultra-wide monitors (>1920px): Cap max container width to maintain aspect ratio
- Portrait video from mobile camera → add `object-fit: cover` to prevent pillarboxing
- No local stream (audio-only mode) → show avatar/placeholder in left panel
- Slow WebRTC connection → both panels show loading states independently
- **Small viewport height (<600px)**: Reduce header/controls height, prioritize video panels
- **Mobile landscape**: Maintain side-by-side layout if width permits, reduce padding
- **Browser zoom >150%**: Ensure controls don't overflow; consider stacking on zoom
- **Sidebar/DevTools open**: Layout adapts to reduced viewport width without horizontal scroll

## Accessibility

- Each panel has descriptive `aria-label`: "Your video feed" / "AI interviewer"
- Ensure keyboard focus indicators visible on controls below split view
- Screen reader announces when AI starts speaking (via S16 integration)

## Tests

- Visual regression: Screenshot comparison at 1920x1080, 768x1024, 375x667
- Responsive: Verify stack behavior on resize
- Unit: Rendering logic for local stream attachment
- **Viewport constraint**: Verify no vertical scroll at standard resolutions
- **Dynamic height**: Test with DevTools open/closed (reduced viewport)
- **Browser zoom**: Test at 100%, 125%, 150%, 200% zoom levels
- **Mobile landscape**: Verify layout on iPhone/Android landscape orientation

## Definition of Done

ModernInterviewPage displays candidate and AI avatar in equal 50/50 horizontal split on desktop, stacks vertically on mobile. Local video feed renders correctly in left panel. Right panel ready for S16 avatar integration. **Entire interface fits within viewport height with no scrolling required at any breakpoint.** Layout adapts gracefully to viewport changes without content overflow.

## Tasks

- [ ] Refactor ModernInterviewPage to use viewport-constrained layout (`h-screen`, `flex-col`)
- [ ] Calculate dynamic heights for header, video section, and controls
- [ ] Refactor VideoAndControls to use CSS Grid layout (50/50 split)
- [ ] Split video rendering into CandidatePanel and AIAvatarPanel components
- [ ] Add responsive breakpoints (Tailwind: `lg:grid-cols-2`)
- [ ] Position controls below split view with fixed height
- [ ] Remove all `overflow-y-auto` and scroll containers
- [ ] Update overlay positioning logic (absolute within panels)
- [ ] Test across viewport sizes (1920x1080, 1366x768, 375x667)
- [ ] Test browser zoom levels (100%, 150%, 200%)
- [ ] Verify no scrolling at any breakpoint

## Dependencies

- None (can proceed immediately after S14)

## Related Stories

- EP5-S16: ReadyPlayerMe Avatar Integration (depends on this layout)
- EP5-S17: Conditional Device Info & Feed Removal (parallel work)
