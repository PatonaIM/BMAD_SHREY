# EP5-S14: Interview Start State & UI Transition Bugfix

As a candidate,
I want the "Start Interview" button to properly hide after I click it,
So that I have a clean, uncluttered interview interface once the session begins.

## Scope

- Fix state transition logic that prevents "Start Interview" button from hiding
- Ensure `interviewPhase` properly transitions from `pre_start` → `intro` → `conducting`
- Verify overlay removal and UI state synchronization
- Add defensive checks for edge cases where state updates might be missed

## Acceptance Criteria

1. "Start Interview" button is visible only when `interviewPhase === 'pre_start'`
2. Button becomes disabled and hides immediately after click
3. Overlay transitions to appropriate phase label (`intro`, `conducting`, etc.)
4. No flickering or race conditions in state updates
5. Console logs (in debug mode) confirm phase transitions
6. State persists correctly if component re-renders during transition

## Root Cause Analysis

Current implementation checks `hasStarted = controller.state.interviewPhase !== 'pre_start'` but the button disable logic may conflict with overlay visibility conditions. The `begin()` callback initiates WebRTC and sends the interview start message, but doesn't immediately set phase to `intro` until the AI responds with the opening greeting via tool execution.

## Technical Approach

1. **Immediate optimistic UI update**: Set `interviewPhase = 'intro'` synchronously in `begin()` before async operations
2. **Consolidate visibility logic**: Single source of truth for button/overlay rendering based on `interviewPhase`
3. **Add transition guards**: Prevent redundant `begin()` calls if already started
4. **Enhanced diagnostics**: Log state changes to console when `NEXT_PUBLIC_DEBUG_INTERVIEW=1`
5. **Tool execution awareness**: Phase transitions now depend on AI tool calls rather than DataChannel events

**Key Implementation Notes:**

- The AI now uses OpenAI function calling (tools) to control interview flow
- Phase changes are triggered by tool execution callbacks in `useInterviewController`
- Button hide logic remains the same: check `interviewPhase !== 'pre_start'`

## Edge Cases

- User clicks "Start Interview" multiple times rapidly → guard with `hasStarted` check
- WebRTC connection fails after button click → show error state, allow retry
- Page refreshes during connection → restore to appropriate phase from session state
- AI tool execution delayed → optimistic phase update ensures UI transitions immediately
- Tool execution fails → error handling reverts to pre_start state with error message

## Tests

- Unit: State transition logic in `useInterviewController`
- Integration: Full button click → overlay hide flow
- E2E: Start interview, verify UI updates within 500ms

## Definition of Done

Clicking "Start Interview" immediately hides the button and overlay, transitioning UI to show video feed without pre-start controls. Verified across Chrome, Safari, Firefox.

## Tasks

- [ ] Add optimistic phase update in `begin()` callback
- [ ] Consolidate phase-based rendering logic in `VideoAndControls`
- [ ] Add console logging for phase transitions (debug mode)
- [ ] Test rapid click prevention
- [ ] Verify across browsers

## Dependencies

- None (isolated bug fix)

## Related Stories

- EP5-S1: Permissions & Device Readiness Gate (prerequisite for start)
- EP5-S2: Realtime OpenAI WebRTC Integration (underlying state management)
- Uses OpenAI function calling (tools) for interview flow control instead of DataChannel events
