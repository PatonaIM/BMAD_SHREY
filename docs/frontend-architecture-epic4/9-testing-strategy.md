# 9. Testing Strategy

## MVP Approach: Manual Testing

**Decision**: Automated tests deferred to post-MVP to accelerate delivery and validate core functionality first.

## Manual Testing Checklist

### Component Testing (Browser DevTools)

**1. ApplicationCard**

- [ ] Renders candidate name, job title, score badge
- [ ] Score badge color correct (green ≥80, blue ≥60, amber <60)
- [ ] Inline actions toolbar displays all action buttons
- [ ] Expand/collapse animation smooth (300ms duration)
- [ ] Detail panel shows full application info when expanded
- [ ] Dark mode: All text readable, borders visible

**2. InlineActions**

- [ ] All action buttons clickable (feedback, schedule, share, expand)
- [ ] Hover states work correctly
- [ ] Icons display correctly (Star, Calendar, Share2, ChevronDown)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Mobile: Touch targets ≥44px

**3. TimelineView**

- [ ] Events display in chronological order (newest first)
- [ ] Role-based filtering works (candidate sees only candidate+both events)
- [ ] Event icons match event type
- [ ] Relative time labels accurate ("2h ago", "Yesterday")
- [ ] Grouping by date works correctly

**4. BottomSheet (Mobile)**

- [ ] Slides up smoothly from bottom on open
- [ ] Backdrop dims background
- [ ] Swipe-to-close gesture works
- [ ] Close button functional
- [ ] Focus trap works (Tab loops within sheet)
- [ ] Body scroll locked when open

**5. SchedulingPanel**

- [ ] Availability grid renders correctly
- [ ] Time slots selectable
- [ ] Booked slots disabled/grayed out
- [ ] Selected slot highlights
- [ ] Confirmation flow works

### Interaction Testing

**Optimistic Updates**

- [ ] Quick feedback: UI updates before server response
- [ ] Loading spinner does NOT show during optimistic update
- [ ] Rollback occurs on server error with toast notification
- [ ] Final state matches server after refetch

**Responsive Behavior**

- [ ] Desktop (≥1024px): Inline expansion used
- [ ] Mobile (<640px): Bottom sheet used
- [ ] Tablet (641-1024px): Context-appropriate UI
- [ ] No horizontal scroll at any breakpoint

**Accessibility**

- [ ] All interactive elements have aria-labels
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces actions (test with VoiceOver/NVDA)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA (use axe DevTools)

### Browser/Device Testing

**Desktop Browsers**

- [ ] Chrome (latest)
- [ ] Safari (macOS)
- [ ] Firefox (latest)
- [ ] Edge (latest)

**Mobile Devices**

- [ ] iPhone SE (375px) - Chrome/Safari
- [ ] iPhone 14 Pro - Safari
- [ ] Samsung Galaxy S21 - Chrome
- [ ] iPad Pro - Safari

**Dark Mode**

- [ ] Toggle light/dark in system settings
- [ ] All components render correctly in both modes
- [ ] No white flashes during transition
- [ ] Tailwind dark: classes working

## Post-MVP Testing Plan

Once MVP validated through manual testing, implement automated tests in this order:

**Phase 1: Unit Tests (Week 1 post-MVP)**

```typescript
// Priority components
- useInlineAction hook (optimistic updates critical)
- TimelineService (filtering logic)
- cn utility (class merging)
- Formatting utilities (dates, numbers)
```

**Phase 2: Integration Tests (Week 2 post-MVP)**

```typescript
// Component integration
- ApplicationCard with API mocks
- TimelineView with role filtering
- SchedulingPanel with booking flow
```

**Phase 3: E2E Tests (Week 3 post-MVP)**

```typescript
// Critical user flows (Playwright)
- Recruiter dashboard → view application → add feedback
- Recruiter dashboard → schedule call → confirm booking
- Candidate timeline → view events → verify filtering
```

**Coverage Target**: 80% code coverage for critical paths only (not 100%)

## Testing Tools (Install when ready)

```bash
# Post-MVP installation
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D @axe-core/playwright  # Accessibility testing
```

---
