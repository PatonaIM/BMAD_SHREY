# Story 5.3: Timeline UI Component Refactor

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 8  
**Priority**: P0  
**Sprint**: Sprint 2 (Weeks 3-4)  
**Status**: Draft

---

## 📋 Story Overview

Refactor the application timeline UI to display the new multi-stage system with dynamic content, role-based views, and interactive actions. This replaces the current linear status display with a rich, visual timeline that shows the complete candidate journey.

---

## 🎯 Acceptance Criteria

- ✅ Timeline displays all stages correctly for both candidate and recruiter views
- ✅ Auto-scroll to active stage on page load
- ✅ Smooth animations with Framer Motion
- ✅ Loading states with skeleton screens
- ✅ Empty states handled gracefully
- ✅ Mobile responsive (stacks vertically)
- ✅ Accessibility: keyboard navigation, ARIA labels, focus management
- ✅ Performance: <50ms render time for 10 stages
- ✅ Dark mode support
- ✅ Storybook documentation complete

---

## 📦 Deliverables

### Tasks

- [ ] **Task 1**: Create ApplicationTimeline Container
  - [ ] File: `src/components/timeline/ApplicationTimeline.tsx`
  - [ ] Main container component that orchestrates timeline display
  - [ ] Fetch stages data using SWR/React Query
  - [ ] Handle loading, error, and empty states
  - [ ] Implement auto-scroll to active stage
  - [ ] Support both candidate and recruiter views
  - [ ] Responsive layout (vertical stack on mobile, horizontal on desktop)

- [ ] **Task 2**: Create TimelineStage Component
  - [ ] File: `src/components/timeline/TimelineStage.tsx`
  - [ ] Individual stage display component
  - [ ] Show stage icon, title, status, timestamps
  - [ ] Display stage-specific content (polymorphic data)
  - [ ] Show action buttons based on role and status
  - [ ] Animate stage entrance with Framer Motion
  - [ ] Support collapsed/expanded states for stage details

- [ ] **Task 3**: Create StageActions Component
  - [ ] File: `src/components/timeline/StageActions.tsx`
  - [ ] Action buttons for stage interactions
  - [ ] Conditional rendering based on role and stage status
  - [ ] Handle click events and open modals
  - [ ] Disabled states with tooltips
  - [ ] Loading states for async actions

- [ ] **Task 4**: Create StageProgress Component
  - [ ] File: `src/components/timeline/StageProgress.tsx`
  - [ ] Visual progress indicator (% complete)
  - [ ] Show completed/total stages
  - [ ] Color-coded progress bar
  - [ ] Milestone markers for key stages

- [ ] **Task 5**: Create StageIcon Component
  - [ ] File: `src/components/timeline/StageIcon.tsx`
  - [ ] Type-specific icons for each StageType
  - [ ] Status-based color coding (pending, in_progress, completed, skipped)
  - [ ] Animated icon transitions
  - [ ] Support custom icons for special stages

- [ ] **Task 6**: Create Supporting Components
  - [ ] File: `src/components/timeline/TimelineHeader.tsx` - Stats summary
  - [ ] File: `src/components/timeline/TimelineFooter.tsx` - Next steps guidance
  - [ ] File: `src/components/timeline/StageContent.tsx` - Polymorphic content renderer
  - [ ] File: `src/components/timeline/StageSkeleton.tsx` - Loading skeleton

- [ ] **Task 7**: Create Custom Hooks
  - [ ] File: `src/hooks/useStages.ts` - Data fetching with SWR
  - [ ] File: `src/hooks/useStageActions.ts` - Action handlers
  - [ ] File: `src/hooks/useActiveStage.ts` - Active stage tracking
  - [ ] File: `src/hooks/useStageScroll.ts` - Auto-scroll functionality

- [ ] **Task 8**: Create Storybook Stories
  - [ ] Story: ApplicationTimeline with various stage configurations
  - [ ] Story: TimelineStage for each stage type
  - [ ] Story: Loading and error states
  - [ ] Story: Mobile vs desktop views
  - [ ] Story: Dark mode

- [ ] **Task 9**: Implement Responsive Design
  - [ ] Mobile: vertical stack, full-width cards
  - [ ] Tablet: 2-column grid
  - [ ] Desktop: horizontal timeline with connecting lines
  - [ ] Touch-friendly tap targets (minimum 44px)
  - [ ] Smooth transitions between breakpoints

- [ ] **Task 10**: Implement Accessibility
  - [ ] Semantic HTML structure
  - [ ] ARIA labels for all interactive elements
  - [ ] Keyboard navigation (Tab, Enter, Space)
  - [ ] Focus management (trap focus in modals)
  - [ ] Screen reader announcements for status changes
  - [ ] Color contrast compliance (WCAG AA)

- [ ] **Task 11**: Write Component Tests
  - [ ] File: `__tests__/components/timeline/ApplicationTimeline.test.tsx`
  - [ ] Test rendering with various stage configurations
  - [ ] Test role-based view differences
  - [ ] Test loading and error states
  - [ ] Test action button interactions
  - [ ] Test accessibility with axe-core

- [ ] **Task 12**: Write Integration Tests
  - [ ] File: `__tests__/integration/timeline.integration.test.tsx`
  - [ ] Test data fetching from API
  - [ ] Test stage updates reflected in UI
  - [ ] Test real user interactions (click, scroll)
  - [ ] Test responsive behavior

---

## 🔗 Dependencies

- **Story 5.2**: Stage Service & Repository Layer (MUST be completed first)
  - Requires: tRPC procedures for fetching stages
  - Requires: API endpoints working

---

## 🏗️ Technical Implementation Details

### Component Architecture

```tsx
<ApplicationTimeline applicationId={id} viewAs="candidate">
  <TimelineHeader stats={stageStats} />

  <StageProgress
    completed={completedStages}
    total={totalStages}
    percentage={progress}
  />

  <StageList stages={stages}>
    {stages.map((stage, index) => (
      <TimelineStage
        key={stage.id}
        stage={stage}
        isActive={stage.id === activeStageId}
        isLast={index === stages.length - 1}
      >
        <StageIcon type={stage.type} status={stage.status} />

        <StageHeader
          title={stage.title}
          status={stage.status}
          timestamps={stage}
        />

        <StageContent data={stage.data} type={stage.type} />

        <StageActions
          candidateActions={stage.candidateActions}
          recruiterActions={stage.recruiterActions}
          viewAs={viewAs}
          onAction={handleAction}
        />

        <StageFooter
          createdAt={stage.createdAt}
          completedAt={stage.completedAt}
        />
      </TimelineStage>
    ))}
  </StageList>

  <TimelineFooter nextSteps={getNextSteps(stages)} />
</ApplicationTimeline>
```

### Data Fetching with SWR

```typescript
// hooks/useStages.ts
export function useStages(
  applicationId: string,
  viewAs: 'candidate' | 'recruiter'
) {
  const { data, error, isLoading, mutate } = useSWR(
    ['stages', applicationId, viewAs],
    () => trpc.stages.list.query({ applicationId, viewAs }),
    {
      refreshInterval: 30000, // Refresh every 30s
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    stages: data?.stages || [],
    activeStage: data?.activeStage,
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

### Stage Type Icons

```typescript
// components/timeline/StageIcon.tsx
const STAGE_ICONS: Record<StageType, React.ComponentType> = {
  submit_application: DocumentCheckIcon,
  ai_interview: MicrophoneIcon,
  under_review: ClockIcon,
  assignment: PencilIcon,
  live_interview: VideoCameraIcon,
  offer: GiftIcon,
  offer_accepted: CheckCircleIcon,
  disqualified: XCircleIcon,
};

const STATUS_COLORS: Record<StageStatus, string> = {
  pending: 'bg-gray-200 text-gray-600',
  awaiting_candidate: 'bg-blue-200 text-blue-600',
  in_progress: 'bg-yellow-200 text-yellow-600',
  awaiting_recruiter: 'bg-purple-200 text-purple-600',
  completed: 'bg-green-200 text-green-600',
  skipped: 'bg-gray-100 text-gray-400',
};
```

### Responsive Layout

```tsx
// Mobile: Vertical stack
<div className="flex flex-col space-y-4 md:hidden">
  {stages.map(stage => <TimelineStage key={stage.id} stage={stage} />)}
</div>

// Desktop: Horizontal timeline
<div className="hidden md:flex md:flex-row md:space-x-8 relative">
  {/* Connecting line */}
  <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300" />

  {stages.map((stage, index) => (
    <TimelineStage
      key={stage.id}
      stage={stage}
      isFirst={index === 0}
      isLast={index === stages.length - 1}
    />
  ))}
</div>
```

### Auto-Scroll to Active Stage

```typescript
// hooks/useStageScroll.ts
export function useStageScroll(activeStageId: string | null) {
  const stageRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (activeStageId && stageRefs.current[activeStageId]) {
      stageRefs.current[activeStageId].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [activeStageId]);

  const registerStageRef = (stageId: string, element: HTMLElement | null) => {
    if (element) {
      stageRefs.current[stageId] = element;
    } else {
      delete stageRefs.current[stageId];
    }
  };

  return { registerStageRef };
}
```

### Polymorphic Stage Content

```tsx
// components/timeline/StageContent.tsx
export function StageContent({ type, data }: StageContentProps) {
  switch (type) {
    case 'assignment':
      return <AssignmentContent data={data as AssignmentData} />;
    case 'live_interview':
      return <LiveInterviewContent data={data as LiveInterviewData} />;
    case 'offer':
      return <OfferContent data={data as OfferData} />;
    case 'offer_accepted':
      return <OnboardingContent data={data as OfferAcceptedData} />;
    default:
      return <GenericContent data={data} />;
  }
}
```

### Framer Motion Animations

```tsx
// Fade in and slide up animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: index * 0.1 }}
>
  <TimelineStage stage={stage} />
</motion.div>

// Active stage pulse animation
<motion.div
  animate={isActive ? { scale: [1, 1.02, 1] } : {}}
  transition={{ repeat: Infinity, duration: 2 }}
>
  <StageIcon />
</motion.div>
```

---

## 🎨 Design Requirements

### Visual Design

- **Colors**: Use existing design system palette
- **Typography**: Follow established hierarchy
- **Spacing**: Consistent 4px/8px grid
- **Shadows**: Subtle elevation for cards
- **Borders**: Rounded corners (8px/12px)

### Animation Style

- **Entrance**: Fade in + slide up (300ms)
- **Status Change**: Smooth color transition (200ms)
- **Active Stage**: Subtle pulse animation
- **Button Hover**: Scale 1.05 (150ms)

### Mobile-First Approach

1. Design for mobile (320px width)
2. Enhance for tablet (768px+)
3. Optimize for desktop (1024px+)

---

## 🧪 Testing Strategy

### Component Unit Tests

1. **ApplicationTimeline**
   - ✅ Renders loading skeleton initially
   - ✅ Renders stages after data loads
   - ✅ Shows error state on fetch failure
   - ✅ Shows empty state with no stages
   - ✅ Auto-scrolls to active stage

2. **TimelineStage**
   - ✅ Renders all stage types correctly
   - ✅ Shows correct icon for stage type
   - ✅ Displays status badge correctly
   - ✅ Shows/hides actions based on role
   - ✅ Expands/collapses on click

3. **StageActions**
   - ✅ Shows candidate actions for candidate view
   - ✅ Shows recruiter actions for recruiter view
   - ✅ Disables actions when stage not actionable
   - ✅ Calls correct handlers on click

### Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('ApplicationTimeline has no accessibility violations', async () => {
  const { container } = render(<ApplicationTimeline {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression Tests

- Use Chromatic for screenshot comparison
- Test all stage types
- Test light/dark modes
- Test mobile/tablet/desktop viewports

### Performance Tests

```typescript
import { render, screen } from '@testing-library/react';
import { Profiler } from 'react';

test('renders 10 stages in <50ms', () => {
  const onRender = jest.fn();

  render(
    <Profiler id="timeline" onRender={onRender}>
      <ApplicationTimeline stages={createMockStages(10)} />
    </Profiler>
  );

  const renderTime = onRender.mock.calls[0][2]; // actualDuration
  expect(renderTime).toBeLessThan(50);
});
```

---

## 📊 Validation Checklist

Before marking this story complete:

- [ ] All 12 tasks completed
- [ ] All components implemented and styled
- [ ] Responsive design works on all viewports
- [ ] Dark mode implemented
- [ ] Accessibility: no axe violations
- [ ] Performance: <50ms render time
- [ ] Component tests: 85%+ coverage
- [ ] Storybook stories documented
- [ ] Code reviewed and approved
- [ ] No TypeScript errors
- [ ] All linting rules passing

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Completion Notes

_To be filled by dev agent upon completion_

### Debug Log References

_Add any debugging notes or issues encountered_

### File List

**Created Files:**

- [ ] `src/components/timeline/ApplicationTimeline.tsx`
- [ ] `src/components/timeline/TimelineStage.tsx`
- [ ] `src/components/timeline/StageActions.tsx`
- [ ] `src/components/timeline/StageProgress.tsx`
- [ ] `src/components/timeline/StageIcon.tsx`
- [ ] `src/components/timeline/TimelineHeader.tsx`
- [ ] `src/components/timeline/TimelineFooter.tsx`
- [ ] `src/components/timeline/StageContent.tsx`
- [ ] `src/components/timeline/StageSkeleton.tsx`
- [ ] `src/hooks/useStages.ts`
- [ ] `src/hooks/useStageActions.ts`
- [ ] `src/hooks/useActiveStage.ts`
- [ ] `src/hooks/useStageScroll.ts`
- [ ] `__tests__/components/timeline/ApplicationTimeline.test.tsx`
- [ ] `__tests__/integration/timeline.integration.test.tsx`
- [ ] Storybook stories for all components

**Modified Files:**

- [ ] None expected

### Change Log

_Document significant changes made during implementation_

---

## 📝 Dev Notes

- Reuse existing button and badge components from design system
- Match animation style from Epic 4 components (consistency)
- Consider virtual scrolling if applications have >20 stages (optimization)
- StageContent polymorphism enables easy addition of new stage types
- Auto-scroll enhances UX - candidates immediately see active stage
- Dark mode colors already defined in Tailwind config

---

## 🔗 Related Stories

- **Story 5.2**: Stage Service & Repository Layer (dependency)
- **Story 5.4**: Assignment Stage Implementation (uses this UI)
- **Story 5.5**: Live Interview Stage (uses this UI)
- **Story 5.6**: Offer Stage (uses this UI)

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
