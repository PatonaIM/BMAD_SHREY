# 2. Project Structure (Epic 4 Additions)

```
src/
├── app/
│   ├── recruiter/                           # NEW - Recruiter pages
│   │   ├── page.tsx                         # Dashboard landing
│   │   ├── layout.tsx                       # Recruiter-specific layout
│   │   ├── jobs/
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 # Job-specific dashboard
│   │   │       └── candidates/
│   │   │           └── [candidateId]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                     # Settings overview
│   │       ├── integrations/page.tsx        # Google Chat/Calendar setup
│   │       └── availability/page.tsx        # Scheduling preferences
│   └── applications/
│       └── [id]/
│           └── timeline/page.tsx            # NEW - Candidate timeline view
│
├── components/
│   ├── recruiter/                           # NEW - Recruiter components
│   │   ├── dashboard/
│   │   │   ├── RecruiterDashboard.tsx       # Main dashboard container
│   │   │   ├── MetricsCard.tsx              # KPI cards (applications, scores, etc.)
│   │   │   ├── RecentActivity.tsx           # Activity feed
│   │   │   └── QuickActions.tsx             # Dashboard quick actions
│   │   ├── applications/
│   │   │   ├── ApplicationCard.tsx          # Inline expandable card
│   │   │   ├── ApplicationGrid.tsx          # Grid layout with filters
│   │   │   ├── InlineActions.tsx            # Quick action toolbar
│   │   │   ├── DetailPanel.tsx              # Expanded application details
│   │   │   └── BulkActions.tsx              # Multi-select actions
│   │   ├── timeline/
│   │   │   ├── TimelineView.tsx             # Dual-perspective timeline
│   │   │   ├── TimelineEvent.tsx            # Individual event card
│   │   │   ├── TimelineFilters.tsx          # Filter by event type/date
│   │   │   └── TimelineGrouping.tsx         # Group by day/week
│   │   ├── scheduling/
│   │   │   ├── SchedulingPanel.tsx          # Availability calendar
│   │   │   ├── AvailabilityGrid.tsx         # Time slot grid
│   │   │   ├── CallScheduler.tsx            # Book call dialog
│   │   │   └── UpcomingCalls.tsx            # Call list widget
│   │   ├── feedback/
│   │   │   ├── FeedbackForm.tsx             # Inline feedback entry
│   │   │   ├── QuickRating.tsx              # Star rating component
│   │   │   ├── FeedbackHistory.tsx          # Past feedback list
│   │   │   └── TagSelector.tsx              # Feedback tags
│   │   ├── suggestions/
│   │   │   ├── CandidateSuggestions.tsx     # AI-powered suggestions
│   │   │   ├── SuggestionCard.tsx           # Individual suggestion
│   │   │   └── SuggestionFilters.tsx        # Filter criteria
│   │   ├── integrations/
│   │   │   ├── GoogleChatSetup.tsx          # Chat webhook config
│   │   │   ├── GoogleCalendarConnect.tsx    # OAuth flow
│   │   │   └── IntegrationStatus.tsx        # Connection status badges
│   │   └── sharing/
│   │       ├── ProfileShareDialog.tsx       # Share link generator
│   │       ├── ShareableLink.tsx            # Generated link display
│   │       └── ShareHistory.tsx             # Share activity log
│   │
│   ├── candidate/
│   │   └── timeline/
│   │       ├── CandidateTimeline.tsx        # NEW - Candidate view
│   │       └── TimelineEventCard.tsx        # Event card (filtered)
│   │
│   └── ui/                                  # Shared UI primitives
│       ├── BottomSheet.tsx                  # NEW - Mobile action sheet
│       ├── InlineExpander.tsx               # NEW - Collapsible container
│       ├── OptimisticLoader.tsx             # NEW - Loading states for optimistic updates
│       ├── Badge.tsx                        # Status badges
│       ├── Button.tsx                       # Button variants
│       ├── Card.tsx                         # Card wrapper
│       ├── Dialog.tsx                       # Modal (minimal usage per UX)
│       ├── Dropdown.tsx                     # Dropdown menu
│       ├── Input.tsx                        # Form input
│       ├── Select.tsx                       # Select dropdown
│       ├── Tabs.tsx                         # Tab navigation
│       └── Toast.tsx                        # Toast notifications
│
├── hooks/
│   ├── recruiter/                           # NEW - Recruiter hooks
│   │   ├── useInlineAction.ts               # Optimistic update hook
│   │   ├── useApplications.ts               # Application data fetching
│   │   ├── useTimeline.ts                   # Timeline data + filters
│   │   ├── useScheduling.ts                 # Availability + booking
│   │   └── useSuggestions.ts                # AI candidate suggestions
│   ├── useMediaQuery.ts                     # Responsive breakpoint detection
│   ├── useBottomSheet.ts                    # Bottom sheet state management
│   └── useOptimisticUpdate.ts               # Generic optimistic update hook
│
├── lib/
│   ├── utils/
│   │   ├── cn.ts                            # Tailwind class merger (clsx + twMerge)
│   │   ├── formatting.ts                    # Date, number, text formatting
│   │   └── timeline.ts                      # NEW - Timeline grouping/filtering logic
│   └── constants/
│       └── recruiter.ts                     # NEW - Recruiter-specific constants
│
└── styles/
    └── globals.css                          # Global Tailwind + custom utilities
```

---
