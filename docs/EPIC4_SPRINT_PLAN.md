# Epic 4 Sprint Planning: Advanced Application Management & Recruiter Tools

**Date**: 2025-11-07  
**Planning Lead**: Winston (Architect)  
**Epic**: Epic 4 - Recruiter-Facing Tools  
**Status**: Ready for Implementation  
**MVP Duration**: 5 Weeks (5 Sprints x 1 Week Each)

---

## 📊 Executive Summary

### Sprint Overview

| Sprint       | Duration | Focus Area                | Stories                 | Complexity | Risk   |
| ------------ | -------- | ------------------------- | ----------------------- | ---------- | ------ |
| **Sprint 1** | Week 1   | Foundation & Setup        | Setup + Story 4.1       | Medium     | Low    |
| **Sprint 2** | Week 2   | Core Services & Dashboard | Story 4.1 (cont.) + 4.2 | High       | Medium |
| **Sprint 3** | Week 3   | Timeline & Suggestions    | Stories 4.4 + 4.3       | High       | Medium |
| **Sprint 4** | Week 4   | Google Integrations       | Stories 4.2 + 4.7       | Very High  | High   |
| **Sprint 5** | Week 5   | Transcription & Polish    | Stories 4.8 + 4.9       | Medium     | Low    |

### Story Mapping to Architecture Sections

| Story                           | Architecture Sections | Frontend Sections | Priority |
| ------------------------------- | --------------------- | ----------------- | -------- |
| 4.1 - Recruiter Dashboard       | 5,6,8                 | 2,3,4,10          | P0       |
| 4.2 - Google Chat               | 3,7,9                 | 7                 | P1       |
| 4.3 - AI Suggestions            | 3,6                   | 3,6               | P1       |
| 4.4 - Dual Timeline             | 4,5,6                 | 3,4,7             | P0       |
| 4.5 - Profile Sharing           | 6,12                  | 3,7               | P2       |
| 4.6 - Multi-Stage Workflow      | 4,5,6                 | 3,7               | P2       |
| 4.7 - Call Scheduling           | 3,7,9                 | 3,4,7             | P1       |
| 4.8 - Gemini Transcription      | 3,7,9                 | 7                 | P1       |
| 4.9 - UX Refresh (Inline-First) | 5,10                  | 3,4,11            | P0       |

### Epic 4 Stories (Based on UX Specifications)

Per the UX specifications document, Epic 4 includes:

1. **EP4-S9**: Recruiter Dashboard with Job Management
2. **EP4-S10**: Google Chat Notification Integration
3. **EP4-S11**: AI-Powered Candidate Suggestions
4. **EP4-S12**: Dual-Perspective Application Timeline
5. **EP4-S13**: Profile Sharing with Signed URLs
6. **EP4-S14**: Multi-Stage Workflow Automation
7. **EP4-S15**: Call Scheduling with Google Calendar
8. **EP4-S16**: Gemini Meeting Transcription
9. **EP4-S17**: UX Refresh (Inline-First Design)

**Note**: The architecture document references "9 stories" (4.1-4.9) while the UX document uses different numbering (EP4-S9 through EP4-S17). This planning maps them accordingly.

---

## 🎯 Sprint 1: Foundation & Core Infrastructure (Week 1)

### Goals

- Set up Epic 4 infrastructure (MongoDB collections, environment variables)
- Create base recruiter pages and routing
- Implement utility functions and UI primitives
- Begin recruiter dashboard implementation

### Stories

- **Setup Tasks** (Days 1-2)
- **Story 4.1 (Part 1)**: Recruiter Dashboard Foundation (Days 3-5)

---

### 📋 Sprint 1 Backlog

#### Day 1-2: Infrastructure Setup

**Backend Setup**

- [ ] Install new dependencies

  ```bash
  npm install googleapis@^126.0.0 @google-cloud/vertexai@^1.1.0 bullmq@^4.12.0
  npm install -D @types/google.calendar@^3.0.0
  ```

- [ ] Create MongoDB migration script

  ```bash
  # Create file: scripts/migrations/epic4-init.ts
  ```

  - Create 5 new collections:
    - `recruiterSubscriptions`
    - `googleChatWebhooks`
    - `interviewFeedback`
    - `availabilitySlots`
    - `scheduledCalls`
  - Add indexes per Section 4 of architecture doc
  - Extend `applications` collection with `timeline: TimelineEvent[]` field
  - Extend `users` collection with `recruiterMetadata` field

- [ ] Run migration

  ```bash
  npm run migrate:epic4
  ```

- [ ] Set up environment variables
  ```env
  # Add to .env.local
  GOOGLE_CHAT_ENABLED=true
  GOOGLE_CALENDAR_CLIENT_ID=xxx
  GOOGLE_CALENDAR_CLIENT_SECRET=xxx
  GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
  GEMINI_API_KEY=xxx
  GEMINI_MODEL=gemini-1.5-pro
  REDIS_URL=redis://localhost:6379
  ```

**Frontend Setup**

- [ ] Install frontend dependencies

  ```bash
  npm install @headlessui/react framer-motion lucide-react clsx tailwind-merge
  npm install -D @tailwindcss/container-queries
  ```

- [ ] Update Tailwind config with Epic 4 custom utilities (Section 5 of frontend architecture)
  - Add custom button variants
  - Add score badge variants
  - Add inline action toolbar styles
  - Add timeline event styles

- [ ] Create utility functions
  - `lib/utils/cn.ts` - Class name merger
  - `lib/utils/formatting.ts` - Date/number formatters
  - `lib/services/timelineService.ts` - Timeline grouping/filtering

- [ ] Create UI primitives (Section 3 of frontend architecture)
  - `components/ui/BottomSheet.tsx`
  - `components/ui/InlineExpander.tsx`
  - `components/ui/OptimisticLoader.tsx`

- [ ] Create responsive hooks
  - `hooks/useMediaQuery.ts`
  - `hooks/useBreakpoints.ts`

**Manual Test Day 2**:

- [ ] Utilities work correctly
- [ ] UI primitives render in light/dark mode
- [ ] MongoDB collections created with indexes
- [ ] Environment variables loaded

---

#### Day 3-5: Recruiter Dashboard Foundation (Story 4.1 Part 1)

**Backend Work (Day 3)**

Reference: `docs/architecture-epic4/6-api-design.md`

- [ ] Create `src/server/api/routers/recruiter.ts`

  ```typescript
  export const recruiterRouter = router({
    getDashboard: protectedProcedure
      .input(z.object({ jobId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        // Aggregate metrics, recent applications
        // Return: { metrics, recentApplications, subscribedJobs }
      }),

    getApplications: protectedProcedure
      .input(
        z.object({
          jobId: z.string().optional(),
          status: z.string().optional(),
          minScore: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        // Filter applications, return paginated results
      }),
  });
  ```

- [ ] Add recruiter router to main tRPC router

  ```typescript
  // src/server/api/root.ts
  export const appRouter = router({
    // ... existing routers
    recruiter: recruiterRouter,
  });
  ```

- [ ] Create data access layer
  - `src/data-access/recruiterSubscriptions.ts`
  - Basic CRUD operations for subscriptions

**Frontend Work (Day 4-5)**

Reference: `docs/frontend-architecture-epic4/2-project-structure-epic-4-additions.md`

- [ ] Create recruiter page structure

  ```
  src/app/recruiter/
  ├── page.tsx              # Dashboard landing
  ├── layout.tsx            # Recruiter-specific layout
  └── settings/
      └── page.tsx          # Settings placeholder
  ```

- [ ] Create dashboard components (Section 2 of frontend architecture)

  ```
  src/components/recruiter/
  ├── dashboard/
  │   ├── RecruiterDashboard.tsx
  │   ├── MetricsCard.tsx
  │   ├── RecentActivity.tsx
  │   └── QuickActions.tsx
  ```

- [ ] Implement MetricsCard component

  ```typescript
  // Display: Total Applications, Avg Score, Pending Reviews, Recent Activity
  // Use Tailwind score badge variants (green ≥80, blue ≥60, amber <60)
  ```

- [ ] Implement RecruiterDashboard container

  ```typescript
  // Fetch data with useQuery hook
  // Display metrics in grid
  // Show recent applications list
  ```

- [ ] Create recruiter hooks
  - `hooks/recruiter/useApplications.ts`
  - `hooks/recruiter/useDashboard.ts`

**Manual Test Day 5**:

- [ ] Dashboard loads with metrics
- [ ] Metrics cards display correct data
- [ ] Recent activity feed works
- [ ] Dark mode renders correctly
- [ ] Mobile responsive (test at 375px)

---

### Sprint 1 Success Criteria

- ✅ All MongoDB collections created with indexes
- ✅ Environment variables configured
- ✅ Utility functions and UI primitives working
- ✅ Recruiter dashboard loads with basic metrics
- ✅ tRPC recruiter router operational
- ✅ Manual testing checklist 100% complete

---

## 🎯 Sprint 2: Core Services & Application Management (Week 2)

### Goals

- Complete recruiter dashboard with application grid
- Implement inline action components
- Build timeline service and views
- Create optimistic update patterns

### Stories

- **Story 4.1 (Part 2)**: Application Grid & Inline Actions (Days 1-3)
- **Story 4.9 (Part 1)**: Inline-First UX Patterns (Days 4-5)

---

### 📋 Sprint 2 Backlog

#### Day 1-3: Application Grid & Inline Actions

Reference: `docs/architecture-epic4/5-component-architecture.md`, `docs/frontend-architecture-epic4/4-inline-first-design-patterns.md`

**Backend Work (Day 1)**

- [ ] Extend recruiter router with application filtering
  ```typescript
  getApplications: protectedProcedure
    .input(z.object({
      jobId: z.string().optional(),
      status: z.enum(['submitted', 'under_review', 'interview_scheduled', 'offer', 'rejected']).optional(),
      minScore: z.number().min(0).max(100).optional(),
      page: z.number().default(1),
      limit: z.number().default(20)
    }))
    .query(async ({ ctx, input }) => {
      // Implement pagination, filtering
      // Return: { applications, total, page, hasMore }
    }),
  ```

**Frontend Work (Day 2-3)**

- [ ] Create ApplicationCard component (Section 4 of frontend architecture)

  ```typescript
  // components/recruiter/applications/ApplicationCard.tsx
  // Features:
  // - Inline expansion with Framer Motion
  // - Score badge with color coding
  // - Inline actions toolbar
  // - Detail panel (collapsed by default)
  ```

- [ ] Create InlineActions component

  ```typescript
  // components/recruiter/applications/InlineActions.tsx
  // Actions: feedback, schedule, share, expand
  // Use Lucide icons
  // Keyboard navigation (Tab, Enter)
  ```

- [ ] Create ApplicationGrid component

  ```typescript
  // components/recruiter/applications/ApplicationGrid.tsx
  // Grid layout with filters
  // Pagination controls
  // Empty state handling
  ```

- [ ] Create DetailPanel component
  ```typescript
  // components/recruiter/applications/DetailPanel.tsx
  // Expanded view: full profile, skills, experience
  // Timeline preview
  // Action buttons
  ```

**Manual Test Day 3**:

- [ ] Application cards render correctly
- [ ] Inline expansion animation smooth (300ms)
- [ ] Score badges color-coded correctly
- [ ] All action buttons clickable
- [ ] Mobile: Bottom sheet for actions
- [ ] Keyboard navigation works

---

#### Day 4-5: Optimistic Updates & Inline Patterns

Reference: `docs/frontend-architecture-epic4/4-inline-first-design-patterns.md`

**Frontend Work**

- [ ] Implement `useInlineAction` hook (Pattern 3 in frontend architecture)

  ```typescript
  // hooks/useInlineAction.ts
  // Features:
  // - Optimistic cache updates
  // - Automatic rollback on error
  // - Toast notifications
  // - Refetch on success
  ```

- [ ] Create FeedbackForm component

  ```typescript
  // components/recruiter/feedback/FeedbackForm.tsx
  // Inline form with:
  // - Star rating (QuickRating component)
  // - Notes textarea
  // - Tag selector
  // - Auto-save draft behavior
  ```

- [ ] Implement QuickRating component

  ```typescript
  // components/recruiter/feedback/QuickRating.tsx
  // 5-star rating with optimistic update
  // Uses useInlineAction hook
  ```

- [ ] Add feedback mutation to recruiter router
  ```typescript
  addFeedback: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      rating: z.number().min(1).max(5),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Create interviewFeedback record
      // Add timeline event
      // Trigger notifications
    }),
  ```

**Manual Test Day 5**:

- [ ] Quick feedback: UI updates instantly
- [ ] No loading spinner during optimistic update
- [ ] Rollback occurs on error with toast
- [ ] Final state matches server after refetch
- [ ] Bottom sheet works on mobile

---

### Sprint 2 Success Criteria

- ✅ Application grid displays with filtering
- ✅ Inline expansion works smoothly
- ✅ Optimistic updates functional with rollback
- ✅ Feedback form saves correctly
- ✅ Mobile responsive with bottom sheets
- ✅ Manual testing checklist 100% complete

---

## 🎯 Sprint 3: Timeline & Candidate Suggestions (Week 3)

### Goals

- Implement dual-perspective timeline with role-based filtering
- Build AI-powered candidate suggestion system
- Create timeline components and grouping logic

### Stories

- **Story 4.4**: Dual-Perspective Application Timeline (Days 1-3)
- **Story 4.3**: AI-Powered Candidate Suggestions (Days 4-5)

---

### 📋 Sprint 3 Backlog

#### Day 1-3: Dual-Perspective Timeline (Story 4.4)

Reference: `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 5), `docs/architecture-epic4/4-data-models-schema-changes.md`

**Backend Work (Day 1)**

- [ ] Implement TimelineService class

  ```typescript
  // src/services/timeline.ts
  export class TimelineService {
    async getTimelineForRole(
      applicationId: string,
      role: UserRole
    ): Promise<TimelineEvent[]> {
      // Load application
      // Filter by visibility (candidate/recruiter/both)
      // Sanitize data based on role
      // Return filtered events
    }

    async addEvent(
      applicationId: string,
      event: Omit<TimelineEvent, 'id' | 'timestamp'>
    ): Promise<void> {
      // Create event with UUID and timestamp
      // Push to applications.timeline array
      // Trigger notifications if applicable
    }
  }
  ```

- [ ] Add timeline procedures to recruiter router

  ```typescript
  getTimeline: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new TimelineService();
      return service.getTimelineForRole(
        input.applicationId,
        ctx.session.user.role
      );
    }),

  addTimelineEvent: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      eventType: z.enum(['status_change', 'interview_completed', 'feedback_added', 'call_scheduled', 'profile_shared', 'score_updated']),
      data: z.record(z.any()),
      visibility: z.enum(['candidate', 'recruiter', 'both'])
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new TimelineService();
      await service.addEvent(input.applicationId, {
        eventType: input.eventType,
        actor: { role: ctx.session.user.role, id: ctx.session.user.id },
        data: input.data,
        visibility: input.visibility
      });
    }),
  ```

**Frontend Work (Day 2-3)**

Reference: `docs/frontend-architecture-epic4/7-api-integration.md`

- [ ] Implement timeline utility functions

  ```typescript
  // lib/services/timelineService.ts (client-side)
  export class TimelineService {
    static groupByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]>;
    static filterByType(
      events: TimelineEvent[],
      types: string[]
    ): TimelineEvent[];
    static getRelativeTime(timestamp: Date | string): string;
  }
  ```

- [ ] Create TimelineView component

  ```typescript
  // components/recruiter/timeline/TimelineView.tsx
  // Features:
  // - Grouped by date
  // - Event icons based on type
  // - Relative time labels
  // - Filters (event type, date range)
  ```

- [ ] Create TimelineEvent component

  ```typescript
  // components/recruiter/timeline/TimelineEvent.tsx
  // Visual timeline with left border
  // Icon badge
  // Event details
  // Expandable for full data
  ```

- [ ] Create CandidateTimeline component (filtered view)

  ```typescript
  // components/candidate/timeline/CandidateTimeline.tsx
  // Same visual design
  // Role-based filtered events
  // Read-only (no add actions)
  ```

- [ ] Create useTimeline hook
  ```typescript
  // hooks/recruiter/useTimeline.ts
  export function useTimeline(applicationId: string) {
    return useQuery({
      queryKey: ['timeline', applicationId],
      queryFn: () => api.recruiter.getTimeline.query({ applicationId }),
    });
  }
  ```

**Manual Test Day 3**:

- [ ] Events display chronologically
- [ ] Role-based filtering works (no data leaks)
- [ ] Event icons match event type
- [ ] Relative time accurate
- [ ] Grouping by date works
- [ ] Candidate vs recruiter views correct

---

#### Day 4-5: AI-Powered Candidate Suggestions (Story 4.3)

Reference: `docs/architecture-epic4/3-tech-stack-alignment.md`, `docs/architecture-epic4/6-api-design.md`

**Backend Work (Day 4)**

- [ ] Implement candidate suggestions endpoint

  ```typescript
  getSuggestedCandidates: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      limit: z.number().default(10)
    }))
    .query(async ({ ctx, input }) => {
      // 1. Get job embedding from jobs collection
      // 2. Vector search candidateProfiles collection
      // 3. Calculate similarity scores
      // 4. Filter by availability/active status
      // 5. Return top N matches with scores and reasons
    }),
  ```

- [ ] Optimize vector search query
  ```typescript
  // Use MongoDB Atlas Vector Search
  const pipeline = [
    {
      $vectorSearch: {
        index: 'profile_embedding_index',
        path: 'embedding',
        queryVector: jobEmbedding,
        numCandidates: 100,
        limit: input.limit,
      },
    },
    {
      $project: {
        score: { $meta: 'vectorSearchScore' },
        // ... other fields
      },
    },
  ];
  ```

**Frontend Work (Day 5)**

- [ ] Create CandidateSuggestions component

  ```typescript
  // components/recruiter/suggestions/CandidateSuggestions.tsx
  // Grid of suggestion cards
  // AI match score badges
  // Quick action buttons (view profile, invite)
  ```

- [ ] Create SuggestionCard component

  ```typescript
  // components/recruiter/suggestions/SuggestionCard.tsx
  // Candidate name, title, location
  // AI match score (e.g., "92% match")
  // Top 3 matching skills
  // Quick preview on hover
  ```

- [ ] Create useSuggestions hook
  ```typescript
  // hooks/recruiter/useSuggestions.ts
  export function useSuggestions(jobId: string, limit = 10) {
    return useQuery({
      queryKey: ['suggestions', jobId, limit],
      queryFn: () =>
        api.recruiter.getSuggestedCandidates.query({ jobId, limit }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }
  ```

**Manual Test Day 5**:

- [ ] Suggestions load for selected job
- [ ] Match scores display correctly
- [ ] Top skills highlighted
- [ ] Quick actions work
- [ ] Empty state when no matches

---

### Sprint 3 Success Criteria

- ✅ Timeline displays with role-based filtering
- ✅ No security leaks (candidate can't see recruiter events)
- ✅ Timeline grouping and relative time work
- ✅ AI suggestions return relevant candidates
- ✅ Vector search performs under 100ms
- ✅ Manual testing checklist 100% complete

---

## 🎯 Sprint 4: Google Integrations (Week 4)

### Goals

- Implement Google Chat webhook integration
- Add Google Calendar OAuth and scheduling
- Build scheduling panel and availability management

### Stories

- **Story 4.2**: Google Chat Webhook Integration (Days 1-2)
- **Story 4.7**: Call Scheduling with Google Calendar (Days 3-5)

---

### 📋 Sprint 4 Backlog

#### Day 1-2: Google Chat Integration (Story 4.2)

Reference: `docs/architecture-epic4/7-external-api-integration.md`, `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 1)

**Backend Work (Day 1)**

- [ ] Implement GoogleChatAdapter class

  ```typescript
  // src/services/googleChat.ts
  export class GoogleChatAdapter extends ExternalApiAdapter<ChatResponse> {
    async sendNotification(
      webhookUrl: string,
      message: ChatMessage
    ): Promise<Result<void>> {
      // Use circuit breaker
      // POST to webhook URL
      // Handle errors gracefully
    }

    async verifyWebhook(url: string): Promise<boolean> {
      // Send test message
      // Return true if successful
    }
  }
  ```

- [ ] Create RecruiterNotificationService

  ```typescript
  // src/services/recruiterNotificationService.ts
  export class RecruiterNotificationService {
    async notifyNewApplication(
      subscription: RecruiterSubscription,
      application: Application
    ): Promise<void> {
      // Try Google Chat first
      // Fallback to email on failure
    }

    private buildApplicationMessage(app: Application): ChatMessage {
      // Format rich card with application details
      // Include action buttons (View, Review)
    }
  }
  ```

- [ ] Add webhook management to recruiter router
  ```typescript
  createSubscription: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      webhookUrl: z.string().url().optional(),
      filters: z.object({
        minScore: z.number().optional(),
        stages: z.array(z.string()).optional()
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify webhook if provided
      // Create recruiterSubscription record
      // Link to googleChatWebhook if URL provided
    }),
  ```

**Frontend Work (Day 2)**

Reference: `docs/frontend-architecture-epic4/2-project-structure-epic-4-additions.md`

- [ ] Create GoogleChatSetup component

  ```typescript
  // components/recruiter/integrations/GoogleChatSetup.tsx
  // Collapsible accordion with 3 steps:
  // 1. Instructions (expandable)
  // 2. Webhook URL input + Test button
  // 3. Notification preferences (expandable)
  ```

- [ ] Create IntegrationStatus component

  ```typescript
  // components/recruiter/integrations/IntegrationStatus.tsx
  // Badge showing connection status
  // Last used timestamp
  // Reconnect button if failed
  ```

- [ ] Add to recruiter settings page
  ```typescript
  // app/recruiter/settings/integrations/page.tsx
  // List of available integrations
  // Google Chat setup section
  // Connection status indicators
  ```

**Manual Test Day 2**:

- [ ] Webhook setup flow completes
- [ ] Test message sends successfully
- [ ] Notification triggers on new application
- [ ] Fallback to email when webhook fails
- [ ] Status badge updates correctly

---

#### Day 3-5: Google Calendar Scheduling (Story 4.7)

Reference: `docs/architecture-epic4/7-external-api-integration.md`, `docs/architecture-epic4/4-data-models-schema-changes.md`

**Backend Work (Day 3-4)**

- [ ] Implement GoogleCalendarService class

  ```typescript
  // src/services/googleCalendar.ts
  export class GoogleCalendarService {
    async createEvent(
      recruiterId: string,
      event: CalendarEvent
    ): Promise<string> {
      // Get OAuth client for recruiter
      // Create calendar event with Google Meet link
      // Return event ID
    }

    async syncAvailability(recruiterId: string): Promise<void> {
      // Fetch freebusy from Google Calendar
      // Update availabilitySlots collection
    }

    private async getOAuthClient(recruiterId: string): Promise<OAuth2Client> {
      // Load tokens from user.recruiterMetadata
      // Refresh if expired
    }
  }
  ```

- [ ] Add OAuth flow to NextAuth config

  ```typescript
  // Add Google provider with calendar scopes
  GoogleProvider({
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    authorization: {
      params: {
        scope: 'openid email profile https://www.googleapis.com/auth/calendar',
      },
    },
  });
  ```

- [ ] Add scheduling procedures to recruiter router

  ```typescript
  getAvailability: protectedProcedure
    .input(z.object({
      recruiterId: z.string(),
      startDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      // Fetch from availabilitySlots
      // Sync from Google Calendar if needed
      // Return available time slots
    }),

  scheduleCall: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      slotId: z.string(),
      duration: z.number().default(30) // minutes
    }))
    .mutation(async ({ ctx, input }) => {
      // Book availabilitySlot
      // Create Google Calendar event
      // Create scheduledCall record
      // Add timeline event
      // Send notifications
      // Return meeting link
    }),
  ```

**Frontend Work (Day 5)**

- [ ] Create SchedulingPanel component

  ```typescript
  // components/recruiter/scheduling/SchedulingPanel.tsx
  // Calendar view (week or day)
  // Available slots highlighted
  // Click to book behavior
  ```

- [ ] Create AvailabilityGrid component

  ```typescript
  // components/recruiter/scheduling/AvailabilityGrid.tsx
  // Time slot grid (15-min intervals)
  // Color coding: available, booked, blocked
  // Drag to select multiple slots (future)
  ```

- [ ] Create CallScheduler component

  ```typescript
  // components/recruiter/scheduling/CallScheduler.tsx
  // Modal/bottom sheet for booking
  // Show candidate name, job
  // Select time slot
  // Add notes
  // Confirm booking
  ```

- [ ] Create useScheduling hook

  ```typescript
  // hooks/recruiter/useScheduling.ts
  export function useScheduling(recruiterId: string, startDate: Date) {
    const availabilityQuery = useQuery({
      queryKey: ['availability', recruiterId, startDate],
      queryFn: () =>
        api.recruiter.getAvailability.query({ recruiterId, startDate }),
    });

    const scheduleCallMutation = useMutation({
      mutationFn: data => api.recruiter.scheduleCall.mutate(data),
      onSuccess: () => {
        // Invalidate queries
        // Show success toast
      },
    });

    return { availabilityQuery, scheduleCallMutation };
  }
  ```

**Manual Test Day 5**:

- [ ] OAuth flow connects calendar
- [ ] Availability slots sync from Google
- [ ] Call scheduling creates event
- [ ] Meeting link generated
- [ ] Candidate receives invite
- [ ] Timeline event created

---

### Sprint 4 Success Criteria

- ✅ Google Chat notifications working
- ✅ Webhook fallback to email functional
- ✅ Google Calendar OAuth connected
- ✅ Call scheduling creates events with Meet links
- ✅ Availability syncs from Google Calendar
- ✅ Manual testing checklist 100% complete

**High Risk Items**:

- Google OAuth token refresh logic
- Webhook verification edge cases
- Calendar API rate limits
- Timezone handling

---

## 🎯 Sprint 5: Transcription & Final Polish (Week 5)

### Goals

- Implement Gemini meeting transcription with async queue
- Complete profile sharing feature
- Final UX polish and manual testing
- Deploy to staging

### Stories

- **Story 4.8**: Gemini Meeting Transcription (Days 1-2)
- **Story 4.5**: Profile Sharing with Signed URLs (Day 3)
- **Final Polish & Testing** (Days 4-5)

---

### 📋 Sprint 5 Backlog

#### Day 1-2: Gemini Transcription (Story 4.8)

Reference: `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 3), `docs/architecture-epic4/7-external-api-integration.md`

**Backend Work (Day 1)**

- [ ] Set up Redis (Vercel KV or local)

  ```bash
  # For local development
  docker run -d -p 6379:6379 redis:7-alpine
  ```

- [ ] Implement GeminiTranscriptionService class

  ```typescript
  // src/services/gemini.ts
  export class GeminiTranscriptionService {
    private queue: Queue<TranscriptionJob>;

    async queueTranscription(
      callId: string,
      audioUrl: string
    ): Promise<string> {
      // Add job to BullMQ queue
      // Update scheduledCall status to 'pending'
      // Return job ID
    }

    private startWorker(): void {
      // BullMQ worker
      // Fetch audio from Azure Blob
      // Call Gemini API with audio
      // Parse transcript
      // Generate summary
      // Update scheduledCall record
      // Retry on failure (3 attempts)
    }
  }
  ```

- [ ] Add transcription procedures to recruiter router

  ```typescript
  getTranscriptionStatus: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ ctx, input }) => {
      const call = await db.scheduledCalls.findById(input.callId);
      return {
        status: call.geminiTranscript?.status || 'not_started',
        summary: call.geminiTranscript?.summary,
        transcript: call.geminiTranscript?.transcript
      };
    }),
  ```

- [ ] Create background worker script
  ```typescript
  // scripts/workers/gemini-transcription-worker.ts
  // Run as separate process
  // Connect to Redis
  // Start GeminiTranscriptionService worker
  ```

**Frontend Work (Day 2)**

- [ ] Create TranscriptionStatus component

  ```typescript
  // components/recruiter/scheduling/TranscriptionStatus.tsx
  // Polling display showing:
  // - pending: "Transcription queued..."
  // - processing: "Processing audio..." (progress bar)
  // - completed: Show summary + link to full transcript
  // - failed: Error message + retry button
  ```

- [ ] Add polling to ScheduledCall detail view
  ```typescript
  // Poll every 5 seconds until status is completed/failed
  useQuery({
    queryKey: ['transcription', callId],
    queryFn: () => api.recruiter.getTranscriptionStatus.query({ callId }),
    refetchInterval: data => {
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 5000; // 5 seconds
      }
      return false; // Stop polling
    },
  });
  ```

**Manual Test Day 2**:

- [ ] Call completes and queues transcription
- [ ] Polling shows status changes
- [ ] Transcript displays when complete
- [ ] Failed transcriptions show error
- [ ] Retry works correctly

---

#### Day 3: Profile Sharing (Story 4.5)

Reference: `docs/architecture-epic4/6-api-design.md`

**Backend Work**

- [ ] Implement profile sharing endpoint

  ```typescript
  shareProfile: protectedProcedure
    .input(z.object({
      applicationId: z.string(),
      expiresIn: z.number().default(7 * 24 * 60 * 60) // 7 days in seconds
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate JWT token with:
      // - applicationId
      // - expiry timestamp
      // - viewer restrictions (optional)

      // Create shareable URL
      const token = jwt.sign(
        { applicationId: input.applicationId },
        process.env.JWT_SECRET,
        { expiresIn: input.expiresIn }
      );

      const url = `${process.env.NEXT_PUBLIC_URL}/shared/profile/${token}`;

      // Add timeline event
      // Return URL
      return { url, expiresAt: new Date(Date.now() + input.expiresIn * 1000) };
    }),
  ```

- [ ] Create shared profile page
  ```typescript
  // app/shared/profile/[token]/page.tsx
  // Public route (no auth required)
  // Verify JWT token
  // Load application data
  // Display read-only profile
  ```

**Frontend Work**

- [ ] Create ProfileShareDialog component

  ```typescript
  // components/recruiter/sharing/ProfileShareDialog.tsx
  // Modal with:
  // - Expiry dropdown (1 day, 7 days, 30 days, custom)
  // - Generate button
  // - Copy to clipboard button
  // - Share history list
  ```

- [ ] Create ShareableLink component
  ```typescript
  // components/recruiter/sharing/ShareableLink.tsx
  // Display generated link
  // Copy button
  // Expiry countdown
  // Revoke button (future)
  ```

**Manual Test Day 3**:

- [ ] Share link generation works
- [ ] Link opens read-only profile
- [ ] Expired links show error
- [ ] Copy to clipboard works
- [ ] Timeline event created

---

#### Day 4-5: Final Polish & Manual Testing

**Polish Tasks (Day 4)**

- [ ] Add loading skeletons to all components

  ```typescript
  // Use Tailwind animate-pulse
  // ApplicationCardSkeleton
  // TimelineSkeleton
  // SuggestionsSkeleton
  ```

- [ ] Add empty states to all lists

  ```typescript
  // "No applications yet" with illustration
  // "No suggestions found" with helpful text
  // "No scheduled calls" with CTA
  ```

- [ ] Add error boundaries to main sections

  ```typescript
  // Wrap RecruiterDashboard
  // Wrap TimelineView
  // Wrap SchedulingPanel
  ```

- [ ] Optimize images and assets

  ```typescript
  // Use Next.js Image component
  // Add loading="lazy" where appropriate
  // Compress avatar images
  ```

- [ ] Add keyboard shortcuts (nice-to-have)
  ```typescript
  // Cmd/Ctrl + K: Quick search
  // Escape: Close modals
  // Tab: Navigate inline actions
  ```

**Comprehensive Manual Testing (Day 5)**

Reference: `docs/architecture-epic4/11-testing-strategy.md`, `docs/frontend-architecture-epic4/9-testing-strategy.md`

Execute complete manual testing checklists:

**Backend Checklist**:

- [ ] All 8 major test areas (Section 11 of backend architecture)
- [ ] Browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile device testing (iPhone SE, Android)

**Frontend Checklist**:

- [ ] Component testing (ApplicationCard, TimelineView, BottomSheet, etc.)
- [ ] Interaction testing (optimistic updates, responsive behavior, accessibility)
- [ ] Browser/device matrix
- [ ] Dark mode validation

**Cross-Browser Testing**:

- [ ] Chrome (latest) - Primary
- [ ] Safari (macOS) - Primary
- [ ] Firefox (latest) - Secondary
- [ ] Edge (latest) - Secondary
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

**Performance Testing**:

- [ ] Lighthouse score >90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] No console errors
- [ ] Network requests optimized

**Accessibility Testing**:

- [ ] Keyboard navigation complete
- [ ] Screen reader test (VoiceOver or NVDA)
- [ ] Color contrast WCAG AA
- [ ] Focus visible on all elements
- [ ] ARIA labels present

---

### Sprint 5 Success Criteria

- ✅ Gemini transcription working with polling
- ✅ Profile sharing with signed URLs functional
- ✅ All components have loading/error/empty states
- ✅ Manual testing checklist 100% complete
- ✅ Cross-browser testing passed
- ✅ Lighthouse score >90
- ✅ Ready for staging deployment

---

## 📦 Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Vercel
- [ ] MongoDB Atlas production cluster ready
- [ ] Redis (Vercel KV) provisioned
- [ ] Google Cloud Console project configured
- [ ] Gemini API key valid with billing enabled
- [ ] DNS records updated (if needed)

### Deployment Steps

1. [ ] Run production build locally

   ```bash
   npm run build
   ```

2. [ ] Fix any build errors

3. [ ] Push to main branch

   ```bash
   git add .
   git commit -m "Epic 4: Advanced Recruiter Tools - MVP Complete"
   git push origin main
   ```

4. [ ] Vercel auto-deploys to staging

5. [ ] Run smoke tests on staging
   - [ ] Dashboard loads
   - [ ] Google Chat test message
   - [ ] Calendar OAuth flow
   - [ ] Timeline displays
   - [ ] Suggestions work

6. [ ] Promote to production (Vercel dashboard)

7. [ ] Monitor Sentry for errors (first 24 hours)

### Post-Deployment

- [ ] Send announcement to stakeholders
- [ ] Create user documentation
- [ ] Schedule user training session
- [ ] Begin collecting feedback
- [ ] Plan post-MVP testing implementation (Week 6+)

---

## 🎓 Architecture Reference Guide

### Key Documents by Sprint

**Sprint 1 (Setup)**:

- Backend: `docs/architecture-epic4/4-data-models-schema-changes.md`
- Backend: `docs/architecture-epic4/9-infrastructure-deployment.md`
- Frontend: `docs/frontend-architecture-epic4/1-frontend-tech-stack.md`
- Frontend: `docs/frontend-architecture-epic4/13-environment-configuration.md`

**Sprint 2 (Dashboard & Inline Actions)**:

- Backend: `docs/architecture-epic4/5-component-architecture.md`
- Backend: `docs/architecture-epic4/6-api-design.md`
- Frontend: `docs/frontend-architecture-epic4/3-component-standards.md`
- Frontend: `docs/frontend-architecture-epic4/4-inline-first-design-patterns.md`

**Sprint 3 (Timeline & Suggestions)**:

- Backend: `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 5)
- Backend: `docs/architecture-epic4/6-api-design.md`
- Frontend: `docs/frontend-architecture-epic4/6-state-management-patterns.md`
- Frontend: `docs/frontend-architecture-epic4/7-api-integration.md`

**Sprint 4 (Google Integrations)**:

- Backend: `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 1)
- Backend: `docs/architecture-epic4/7-external-api-integration.md`
- Frontend: `docs/frontend-architecture-epic4/2-project-structure-epic-4-additions.md`

**Sprint 5 (Transcription & Polish)**:

- Backend: `docs/architecture-epic4/3-tech-stack-alignment.md` (Pattern 3)
- Backend: `docs/architecture-epic4/11-testing-strategy.md`
- Frontend: `docs/frontend-architecture-epic4/9-testing-strategy.md`
- Frontend: `docs/frontend-architecture-epic4/10-performance-optimization.md`

### Quick File Reference

**Create These Files**:

```bash
# Backend
src/server/api/routers/recruiter.ts
src/services/googleChat.ts
src/services/googleCalendar.ts
src/services/gemini.ts
src/services/timeline.ts
src/services/recruiterNotificationService.ts
src/data-access/recruiterSubscriptions.ts
src/data-access/googleChatWebhooks.ts
src/data-access/interviewFeedback.ts
src/data-access/availabilitySlots.ts
src/data-access/scheduledCalls.ts

# Frontend
src/app/recruiter/page.tsx
src/app/recruiter/layout.tsx
src/app/recruiter/settings/page.tsx
src/components/recruiter/dashboard/RecruiterDashboard.tsx
src/components/recruiter/dashboard/MetricsCard.tsx
src/components/recruiter/applications/ApplicationCard.tsx
src/components/recruiter/applications/InlineActions.tsx
src/components/recruiter/timeline/TimelineView.tsx
src/components/recruiter/timeline/TimelineEvent.tsx
src/components/recruiter/suggestions/CandidateSuggestions.tsx
src/components/recruiter/scheduling/SchedulingPanel.tsx
src/components/ui/BottomSheet.tsx
src/components/ui/InlineExpander.tsx
src/hooks/useInlineAction.ts
src/hooks/recruiter/useApplications.ts
src/hooks/recruiter/useTimeline.ts
src/hooks/recruiter/useSuggestions.ts
src/hooks/recruiter/useScheduling.ts
src/lib/utils/cn.ts
src/lib/services/timelineService.ts

# Scripts
scripts/migrations/epic4-init.ts
scripts/workers/gemini-transcription-worker.ts
```

---

## 📊 Risk Assessment

### High Risk Items

| Risk                            | Impact | Mitigation                                       | Sprint   |
| ------------------------------- | ------ | ------------------------------------------------ | -------- |
| Google OAuth token refresh      | High   | Implement robust refresh logic with retries      | Sprint 4 |
| Calendar API rate limits        | Medium | Cache availability, batch requests               | Sprint 4 |
| Gemini API costs                | Medium | Monitor usage, implement quotas                  | Sprint 5 |
| Webhook verification edge cases | Medium | Comprehensive error handling, fallback to email  | Sprint 4 |
| Timeline security (data leaks)  | High   | Extensive manual testing of role-based filtering | Sprint 3 |
| Optimistic update rollback      | Medium | Thorough error handling, automatic retry         | Sprint 2 |

### Mitigation Strategies

1. **Google API Issues**:
   - Test OAuth flow extensively
   - Implement token refresh before expiry
   - Add webhook retry logic

2. **Performance**:
   - Use code splitting (next/dynamic)
   - Implement virtualized lists if >100 applications
   - Monitor Lighthouse scores daily

3. **Security**:
   - Server-side timeline filtering (never client-side)
   - Encrypt Google Calendar tokens at rest
   - Validate webhook URLs before storing

4. **Testing**:
   - Manual testing checklist after each sprint
   - Cross-browser testing before deployment
   - Accessibility audit with axe DevTools

---

## 🎯 Success Metrics

### Technical Metrics

- [ ] Lighthouse Performance Score: >90
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3s
- [ ] API Response Time (p95): <500ms
- [ ] Vector Search Latency: <100ms
- [ ] Zero critical Sentry errors in first week

### Feature Metrics

- [ ] Recruiter dashboard loads with correct metrics
- [ ] Inline actions complete in <2s (perceived)
- [ ] Timeline displays with 100% role-based filtering accuracy
- [ ] Google Chat notifications deliver in <30s
- [ ] Calendar scheduling creates events successfully
- [ ] Gemini transcription completes within 5 minutes

### User Experience Metrics

- [ ] 70% modal reduction achieved (inline-first goal)
- [ ] 40% faster task completion (per UX specs)
- [ ] Zero accessibility violations (axe DevTools)
- [ ] Mobile responsive at 375px width
- [ ] Dark mode fully functional

---

## 📝 Post-MVP Roadmap

### Week 6+: Automated Testing (Priority)

Reference: `docs/architecture-epic4/11-testing-strategy.md` (Post-MVP Plan)

**Phase 1: Unit Tests (Week 1)**

- [ ] `useInlineAction` hook tests
- [ ] `TimelineService` tests
- [ ] Utility function tests (`cn`, formatters)
- Target: 80% coverage for critical paths

**Phase 2: Integration Tests (Week 2)**

- [ ] tRPC procedure tests with mocks
- [ ] Component integration tests
- [ ] API service tests

**Phase 3: E2E Tests (Week 3)**

- [ ] Recruiter dashboard flow
- [ ] Timeline filtering flow
- [ ] Scheduling flow
- Target: 3-5 critical user journeys

### Future Enhancements

**P1 (Next Epic)**:

- [ ] Bulk actions on applications
- [ ] Custom workflow templates
- [ ] Advanced search with saved queries
- [ ] Team collaboration features

**P2 (Later)**:

- [ ] Automated status updates based on rules
- [ ] Interview scorecard standardization
- [ ] Candidate comparison side-by-side
- [ ] White-label capabilities

---

**Sprint Planning Complete** ✅

_This document provides a complete 5-week implementation roadmap for Epic 4 with daily tasks, architecture references, testing checklists, and deployment procedures. All stories are mapped to specific architecture sections for efficient development._

**Questions or clarifications?** Refer to the architecture documents in `docs/architecture-epic4/` and `docs/frontend-architecture-epic4/` directories.
