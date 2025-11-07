# 5. Component Architecture

## New Components (Inline-First Design)

```
src/components/recruiter/
├── RecruiterDashboard.tsx          # Main dashboard with metrics
├── ApplicationCard.tsx             # Inline expandable card
├── InlineActions.tsx               # Quick actions toolbar
├── TimelineView.tsx                # Dual-perspective timeline
├── CandidateSuggestions.tsx        # AI-powered suggestions
├── ProfileShareDialog.tsx          # Share link generator
├── SchedulingPanel.tsx             # Availability + booking
├── GoogleChatSetup.tsx             # Webhook configuration
└── FeedbackForm.tsx                # Inline feedback entry

src/components/candidate/
└── CandidateTimeline.tsx           # Filtered timeline view
```

## Key Component Patterns

**1. Inline Expansion (70% modal reduction)**

```typescript
<ApplicationCard application={app}>
  <InlineActions
    onExpand={() => setExpanded(true)}
    actions={['schedule', 'feedback', 'share']}
  />
  {expanded && <DetailPanel />}
</ApplicationCard>
```

**2. Optimistic Updates**

```typescript
const mutation = useMutation({
  onMutate: async data => {
    await queryClient.cancelQueries(['applications']);
    const previous = queryClient.getQueryData(['applications']);
    queryClient.setQueryData(['applications'], optimisticUpdate(data));
    return { previous };
  },
  onError: (err, data, context) => {
    queryClient.setQueryData(['applications'], context.previous);
  },
});
```

**3. Bottom Sheets (Mobile)**

```typescript
<BottomSheet open={isMobile && actionOpen}>
  <FeedbackForm onSubmit={handleSubmit} />
</BottomSheet>
```

---
