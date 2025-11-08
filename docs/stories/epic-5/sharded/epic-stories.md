# 📦 Epic Stories

## Story 5.1: Core Stage Data Model & Migration

**Priority**: P0 | **Estimate**: 3 days | **Sprint**: 1

**As a** developer  
**I want** to implement the new stage-based data model and migrate existing applications  
**So that** we have a solid foundation for dynamic timeline features

### Acceptance Criteria

- [ ] New TypeScript types created in `src/shared/types/applicationStage.ts`
- [ ] Application schema updated with `stages[]` field, `currentStageId`, `isDisqualified`
- [ ] Migration script converts existing `status` + `timeline` to new `stages[]` format
- [ ] All existing applications successfully migrated without data loss
- [ ] MongoDB indexes created for `stages` queries (by order, by status, by type)
- [ ] Backward compatibility: Old status field maintained temporarily for safety
- [ ] Unit tests for stage utilities (create, update, transition, validate)

### Technical Details

**Migration Strategy**:

1. Run migration on staging first (dry-run mode)
2. Verify data integrity (all applications have valid stages)
3. Backup production database
4. Run production migration with rollback plan
5. Monitor for 24h before removing old status field

**Files to Create/Modify**:

- `src/shared/types/applicationStage.ts` (NEW)
- `src/shared/types/application.ts` (MODIFY - add stages field)
- `scripts/migrations/migrate-to-stages.ts` (NEW)
- `src/utils/stageHelpers.ts` (NEW - utility functions)

---

## Story 5.2: Stage Service & Repository Layer

**Priority**: P0 | **Estimate**: 4 days | **Sprint**: 1

**As a** developer  
**I want** a service layer for stage management operations  
**So that** business logic is centralized and testable

### Acceptance Criteria

- [ ] `StageService` class created with CRUD operations for stages
- [ ] Methods: `createStage()`, `updateStageStatus()`, `addStageData()`, `getActiveStage()`, `getStagesByType()`, `canProgressToStage()`, `validateStageTransition()`
- [ ] `ApplicationStageRepository` created for database operations
- [ ] Stage creation enforces business rules (max 3 assignments, order validation)
- [ ] Stage transition validation prevents invalid state changes
- [ ] Role-based filtering built into repository (candidate sees only visible stages)
- [ ] Integration with existing TimelineService for audit events
- [ ] Error handling with specific error types (InvalidTransitionError, MaxStagesError)
- [ ] Unit tests achieving 85%+ coverage

### Technical Details

**Key Methods**:

```typescript
class StageService {
  // Core CRUD
  async createStage(
    applicationId: string,
    stageType: StageType,
    createdBy: Actor
  ): Promise<ApplicationStage>;
  async updateStageStatus(
    stageId: string,
    newStatus: StageStatus
  ): Promise<void>;
  async addStageData(stageId: string, data: Partial<StageData>): Promise<void>;

  // Queries
  async getActiveStage(applicationId: string): Promise<ApplicationStage>;
  async getStagesByApplication(
    applicationId: string,
    role: UserRole
  ): Promise<ApplicationStage[]>;
  async getStageById(stageId: string): Promise<ApplicationStage>;

  // Business logic
  async canProgressToStage(
    applicationId: string,
    stageType: StageType
  ): Promise<boolean>;
  async validateStageTransition(
    stageId: string,
    newStatus: StageStatus
  ): Promise<ValidationResult>;
  async getAvailableActions(stageId: string, role: UserRole): Promise<Action[]>;

  // Stage management
  async insertStage(
    applicationId: string,
    afterStageId: string,
    newStageType: StageType
  ): Promise<ApplicationStage>;
  async cancelStage(stageId: string, reason?: string): Promise<void>;
  async reorderStages(
    applicationId: string,
    stageOrder: string[]
  ): Promise<void>;
}
```

**Files to Create**:

- `src/services/stageService.ts` (NEW - 400+ lines)
- `src/data-access/repositories/applicationStageRepo.ts` (NEW - 300+ lines)
- `src/utils/stageValidation.ts` (NEW - validation rules)
- `__tests__/services/stageService.test.ts` (NEW - unit tests)

---

## Story 5.3: Timeline UI Component Refactor

**Priority**: P0 | **Estimate**: 5 days | **Sprint**: 2

**As a** candidate or recruiter  
**I want** to see an intuitive visual timeline of application stages  
**So that** I understand progress and know what actions to take

### Acceptance Criteria

- [ ] `TimelineStage` component created for individual stage rendering
- [ ] `StageActions` component for candidate/recruiter action buttons
- [ ] `StageProgress` component showing before/in-progress/completed states
- [ ] `ApplicationTimeline` container component orchestrating stage list
- [ ] Scroll-snap behavior auto-scrolls to active stage on load
- [ ] Visual indicators: progress bar, completion badges, stage icons
- [ ] Responsive design: mobile uses vertical timeline, desktop can use horizontal
- [ ] Animations: smooth transitions when stages update (Framer Motion)
- [ ] Empty states: "Waiting for recruiter", "No active stages"
- [ ] Loading states with skeleton screens
- [ ] Dark mode support

### Technical Details

**Component Hierarchy**:

```
ApplicationTimeline (container)
├── TimelineHeader (summary stats)
├── StageList (map over stages)
│   ├── TimelineStage (individual stage)
│   │   ├── StageIcon (type-specific icon)
│   │   ├── StageHeader (title, status badge)
│   │   ├── StageContent (description, data display)
│   │   ├── StageActions (role-specific buttons)
│   │   └── StageFooter (timestamps, actor info)
└── TimelineFooter (next steps hint)
```

**Scroll-Snap Implementation**:

```tsx
// Use CSS scroll-snap-type + useEffect for auto-scroll
useEffect(() => {
  const activeStageElement = document.getElementById(`stage-${currentStageId}`);
  activeStageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, [currentStageId]);
```

**Files to Create**:

- `src/components/timeline/ApplicationTimeline.tsx` (NEW)
- `src/components/timeline/TimelineStage.tsx` (NEW)
- `src/components/timeline/StageActions.tsx` (NEW)
- `src/components/timeline/StageProgress.tsx` (NEW)
- `src/components/timeline/StageIcon.tsx` (NEW)
- `src/hooks/useStages.ts` (NEW - data fetching hook)
- `src/hooks/useStageActions.ts` (NEW - action handlers hook)

---

## Story 5.4: Assignment Stage Implementation (Candidate + Recruiter)

**Priority**: P0 | **Estimate**: 5 days | **Sprint**: 2

**As a** recruiter  
**I want** to give candidates assignments (PDFs or links)  
**So that** I can assess their technical skills asynchronously

**As a** candidate  
**I want** to view assignment details, upload my solution, and receive feedback  
**So that** I can demonstrate my skills and progress in the hiring process

### Acceptance Criteria

**Recruiter Side**:

- [ ] "Give Assignment" button available on application detail page
- [ ] Assignment creation modal with fields: title, description, document (upload or link), time limit (optional)
- [ ] Document upload integrates with Azure Storage
- [ ] Assignment inserted into timeline at correct position (after AI interview or current stage)
- [ ] Multiple assignments (up to 3) can be created per application
- [ ] Assignment can be cancelled before candidate starts (status: pending)
- [ ] Assignment list view shows all assignments with status badges
- [ ] Submitted assignments show "View Submission" button
- [ ] Feedback modal with rating (1-5 stars) and comments (max 1000 chars)
- [ ] Feedback submission marks stage as complete and adds timeline event

**Candidate Side**:

- [ ] Assignment stage displays title, description, document link/download
- [ ] Time limit countdown shown if specified
- [ ] "Upload Answer" button opens file picker (PDF, DOC, images up to 5MB)
- [ ] Upload progress indicator during file upload
- [ ] Upload success confirmation with submission timestamp
- [ ] After upload, status changes to "Awaiting Feedback"
- [ ] Feedback displays with rating stars and comments once provided
- [ ] Cannot re-upload after submission (future: allow recruiter to request resubmission)

### Technical Details

**tRPC Procedures** (`recruiterRouter`):

```typescript
giveAssignment: protectedProcedure
  .input(
    z.object({
      applicationId: z.string(),
      title: z.string(),
      description: z.string(),
      documentType: z.enum(['upload', 'link']),
      documentUrl: z.string().optional(), // Pre-signed upload URL or direct link
      timeLimit: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: max 3 assignments
    // 2. Create new stage (type: assignment, status: pending)
    // 3. Insert stage into application.stages
    // 4. Send notification to candidate
    // 5. Return stage ID
  });

submitAssignmentFeedback: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      rating: z.number().min(1).max(5),
      comments: z.string().max(1000),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Update stage data with feedback
    // 2. Change stage status to completed
    // 3. Add timeline event
    // 4. Notify candidate
  });
```

**tRPC Procedures** (`candidateRouter`):

```typescript
uploadAssignmentAnswer: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      fileUrl: z.string(), // Pre-signed Azure upload URL
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate file uploaded successfully
    // 2. Update stage data with submissionUrl
    // 3. Change status to awaiting_recruiter
    // 4. Add timeline event
    // 5. Notify recruiter
  });
```

**Files to Create/Modify**:

- `src/components/recruiter/actions/GiveAssignmentModal.tsx` (NEW)
- `src/components/recruiter/actions/AssignmentFeedbackModal.tsx` (NEW)
- `src/components/candidate/stages/AssignmentStage.tsx` (NEW)
- `src/components/candidate/actions/UploadAssignmentModal.tsx` (NEW)
- `src/services/trpc/recruiterRouter.ts` (MODIFY - add procedures)
- `src/services/trpc/candidateRouter.ts` (MODIFY - add procedures)
- `src/hooks/useAssignment.ts` (NEW)

---

## Story 5.5: Live Interview Stage Implementation

**Priority**: P0 | **Estimate**: 4 days | **Sprint**: 3

**As a** recruiter  
**I want** to schedule live interviews with candidates via Google Calendar  
**So that** I can conduct real-time assessments and provide personal interaction

**As a** candidate  
**I want** to select interview time slots, receive meeting links, and request reschedules  
**So that** I can participate in interviews at convenient times

### Acceptance Criteria

**Recruiter Side** (integrates with Epic 4 Google Calendar):

- [ ] "Schedule Interview" button creates live interview stage
- [ ] Interview scheduling modal reuses `CallScheduler` component from Epic 4
- [ ] Scheduled interview creates `scheduledCalls` record and stage simultaneously
- [ ] Interview stage shows scheduled time, Meet link, and status
- [ ] After interview, "Give Feedback" button available
- [ ] Feedback modal identical to assignment feedback
- [ ] Multiple live interviews (up to 3) supported per application
- [ ] Can cancel interview before scheduled time (status changes to skipped)

**Candidate Side**:

- [ ] Live interview stage shows "Select Time Slot" if recruiter added availability
- [ ] Slot picker displays available times from recruiter's calendar (Epic 4 integration)
- [ ] After booking, displays scheduled time and Google Meet link
- [ ] "Request Reschedule" button available up to 24h before interview
- [ ] Reschedule request creates notification for recruiter
- [ ] After interview completion, feedback displays (if provided)
- [ ] Cannot reschedule within 24h of scheduled time (disabled with tooltip)

### Technical Details

**Integration with Epic 4**:

- Reuse `GoogleCalendarService` for creating calendar events
- Reuse `scheduledCallRepo` for storing interview records
- Link `scheduledCalls._id` to `LiveInterviewData.scheduledCallId`
- Sync status between scheduledCall and stage (completed, cancelled, etc.)

**tRPC Procedures** (`recruiterRouter`):

```typescript
scheduleInterview: protectedProcedure
  .input(
    z.object({
      applicationId: z.string(),
      title: z.string().optional(),
      scheduledAt: z.date(),
      duration: z.number(), // minutes
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Create live_interview stage
    // 2. Call GoogleCalendarService.createEvent()
    // 3. Create scheduledCall record
    // 4. Link stage.data.scheduledCallId to call._id
    // 5. Notify candidate with Meet link
    // 6. Return stage ID + meet link
  });

submitInterviewFeedback: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      rating: z.number().min(1).max(5),
      comments: z.string().max(1000),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Same as assignment feedback
  });
```

**tRPC Procedures** (`candidateRouter`):

```typescript
requestReschedule: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: >24h before interview
    // 2. Update stage data with reschedule request
    // 3. Notify recruiter
    // 4. Return success
  });
```

**Files to Create/Modify**:

- `src/components/recruiter/actions/ScheduleInterviewModal.tsx` (NEW - wraps CallScheduler)
- `src/components/candidate/stages/LiveInterviewStage.tsx` (NEW)
- `src/components/candidate/actions/RescheduleRequestModal.tsx` (NEW)
- `src/services/stageService.ts` (MODIFY - add interview-specific methods)
- `src/services/trpc/recruiterRouter.ts` (MODIFY)
- `src/services/trpc/candidateRouter.ts` (MODIFY)

---

## Story 5.6: Offer Stage & Acceptance Flow

**Priority**: P0 | **Estimate**: 4 days | **Sprint**: 3

**As a** recruiter  
**I want** to send formal offers to candidates with offer letters  
**So that** I can extend employment opportunities and track acceptance

**As a** candidate  
**I want** to review offers, accept or reject with optional feedback  
**So that** I can make informed career decisions

### Acceptance Criteria

**Recruiter Side**:

- [ ] "Send Offer" button available after all interviews/assignments completed
- [ ] Offer modal allows uploading offer letter PDF (Azure Storage)
- [ ] Offer stage created with status: awaiting_candidate
- [ ] Offer list view shows pending/accepted/rejected offers
- [ ] After acceptance, automatically creates `offer_accepted` stage
- [ ] After rejection, application marked as disqualified with reason
- [ ] "Revoke Offer" button available before candidate decision (disqualifies application)

**Candidate Side**:

- [ ] Offer stage displays "View Offer Letter" button (PDF viewer or download)
- [ ] Accept/Reject buttons prominently displayed
- [ ] Rejection requires optional reason (textarea, max 500 chars)
- [ ] Acceptance confirmation dialog explains next steps (onboarding)
- [ ] After acceptance, transitions to "Offer Accepted" stage
- [ ] After rejection, journey stops with "Application Closed" message

### Technical Details

**tRPC Procedures** (`recruiterRouter`):

```typescript
sendOffer: protectedProcedure
  .input(
    z.object({
      applicationId: z.string(),
      offerLetterUrl: z.string(), // Pre-signed Azure upload URL
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: all required stages completed
    // 2. Create offer stage
    // 3. Update status to awaiting_candidate
    // 4. Notify candidate
    // 5. Return stage ID
  });

revokeOffer: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      reason: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Update stage status to skipped
    // 2. Disqualify application
    // 3. Notify candidate
  });
```

**tRPC Procedures** (`candidateRouter`):

```typescript
respondToOffer: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      decision: z.enum(['accepted', 'rejected']),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (input.decision === 'accepted') {
      // 1. Update offer stage status to completed
      // 2. Create offer_accepted stage
      // 3. Update application.currentStageId
      // 4. Notify recruiter
    } else {
      // 1. Update offer stage with rejection reason
      // 2. Mark application as disqualified
      // 3. Set journey completion
      // 4. Notify recruiter
    }
  });
```

**Files to Create/Modify**:

- `src/components/recruiter/actions/SendOfferModal.tsx` (NEW)
- `src/components/candidate/stages/OfferStage.tsx` (NEW)
- `src/components/candidate/actions/OfferDecisionModal.tsx` (NEW)
- `src/services/trpc/recruiterRouter.ts` (MODIFY)
- `src/services/trpc/candidateRouter.ts` (MODIFY)

---

## Story 5.7: Onboarding Document Upload (Offer Accepted Stage)

**Priority**: P1 | **Estimate**: 3 days | **Sprint**: 4

**As a** candidate who accepted an offer  
**I want** to upload required onboarding documents (ID, education certificates)  
**So that** I can complete pre-joining formalities

**As a** recruiter  
**I want** to track which onboarding documents have been uploaded  
**So that** I can ensure compliance and readiness for candidate's start date

### Acceptance Criteria

**Candidate Side**:

- [ ] Offer Accepted stage displays welcome message and document checklist
- [ ] Document types: ID Proof, Education Certificates, Other (custom)
- [ ] Upload button for each document type (PDF, images up to 5MB)
- [ ] Progress indicator shows uploaded vs required documents
- [ ] Uploaded documents list with file names and upload timestamps
- [ ] "Start Onboarding" button enabled after all required docs uploaded (future: triggers onboarding flow)

**Recruiter Side**:

- [ ] Offer Accepted stage shows document upload status for recruiter
- [ ] List of uploaded documents with download links
- [ ] Can mark application as "Onboarding Complete" (future status)
- [ ] Notification when all documents uploaded

### Technical Details

**tRPC Procedures** (`candidateRouter`):

```typescript
uploadOnboardingDocument: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      documentType: z.enum(['ID', 'Education', 'Other']),
      documentName: z.string(),
      documentUrl: z.string(), // Azure Storage URL
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate file uploaded successfully
    // 2. Add to stage.data.onboardingDocuments[]
    // 3. Notify recruiter if all docs uploaded
    // 4. Return updated document list
  });
```

**Files to Create/Modify**:

- `src/components/candidate/stages/OfferAcceptedStage.tsx` (NEW)
- `src/components/candidate/actions/UploadOnboardingDocModal.tsx` (NEW)
- `src/components/recruiter/stages/RecruiterOfferAcceptedView.tsx` (NEW)
- `src/services/trpc/candidateRouter.ts` (MODIFY)

---

## Story 5.8: Disqualification & Journey Termination

**Priority**: P0 | **Estimate**: 2 days | **Sprint**: 4

**As a** recruiter  
**I want** to disqualify candidates at any stage with optional feedback  
**So that** I can maintain pipeline quality and provide closure to candidates

**As a** candidate  
**I want** to understand why my application was not successful  
**So that** I can learn and improve for future opportunities

### Acceptance Criteria

**Recruiter Side**:

- [ ] "Disqualify" button available on every stage (confirmation dialog)
- [ ] Disqualification modal with optional reason (predefined tags + free text)
- [ ] Predefined reasons: "Skills mismatch", "Experience mismatch", "Culture fit", "Position filled", "Other"
- [ ] Disqualification marks application.isDisqualified = true
- [ ] All future stages hidden after disqualification
- [ ] Completed stages remain visible (historical record)
- [ ] Timeline event added with disqualification reason

**Candidate Side**:

- [ ] Disqualified applications show "Application Closed" banner
- [ ] Feedback displayed if recruiter provided reason
- [ ] Default message if no reason: "Thank you for your interest. We've decided to move forward with other candidates."
- [ ] Completed stages remain visible (progress acknowledgment)
- [ ] No future actions available (all buttons disabled)
- [ ] Optional: "Request Feedback" button (future feature)

### Technical Details

**tRPC Procedures** (`recruiterRouter`):

```typescript
disqualifyApplication: protectedProcedure
  .input(
    z.object({
      applicationId: z.string(),
      reason: z.string().optional(),
      reasonCategory: z
        .enum([
          'skills',
          'experience',
          'culture_fit',
          'position_filled',
          'other',
        ])
        .optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Set application.isDisqualified = true
    // 2. Set application.disqualificationReason
    // 3. Set application.journeyCompletedAt
    // 4. Update current stage status to skipped
    // 5. Add timeline event
    // 6. Notify candidate
    // 7. Return success
  });
```

**Files to Create/Modify**:

- `src/components/recruiter/actions/DisqualifyModal.tsx` (NEW)
- `src/components/candidate/DisqualifiedBanner.tsx` (NEW)
- `src/services/trpc/recruiterRouter.ts` (MODIFY)
- `src/services/stageService.ts` (MODIFY - handle disqualification logic)

---

## Story 5.9: Stage Management UI (Recruiter Tools)

**Priority**: P1 | **Estimate**: 3 days | **Sprint**: 4

**As a** recruiter  
**I want** advanced stage management tools (reorder, cancel, replace)  
**So that** I can adapt workflows to changing hiring needs

### Acceptance Criteria

**Recruiter Side**:

- [ ] Stage management panel accessible from application detail page
- [ ] Drag-and-drop to reorder stages (only pending/in-progress stages)
- [ ] "Cancel Stage" button on pending stages (changes status to skipped)
- [ ] "Replace Stage" allows swapping assignment with live interview (vice versa)
- [ ] Validation prevents reordering completed stages
- [ ] Validation enforces submit_application always first, offer/offer_accepted always last
- [ ] Stage count badges show "Assignments: 2/3", "Interviews: 1/3"
- [ ] Bulk actions: "Cancel all pending assignments" (future)

### Technical Details

**tRPC Procedures** (`recruiterRouter`):

```typescript
reorderStages: protectedProcedure
  .input(
    z.object({
      applicationId: z.string(),
      stageOrder: z.array(z.string()), // Ordered array of stage IDs
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: completed stages not reordered
    // 2. Validate: submit always first, offer/offer_accepted always last
    // 3. Update stage.order fields
    // 4. Return updated stages
  });

cancelStage: protectedProcedure
  .input(
    z.object({
      stageId: z.string(),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: stage status is pending or in_progress
    // 2. Change status to skipped
    // 3. Add timeline event
    // 4. Notify candidate if stage was in_progress
    // 5. Return success
  });
```

**Files to Create/Modify**:

- `src/components/recruiter/stages/StageManagementPanel.tsx` (NEW)
- `src/components/recruiter/stages/StageReorderDnd.tsx` (NEW - drag-and-drop)
- `src/services/trpc/recruiterRouter.ts` (MODIFY)

---

## Story 5.10: Mobile Responsive Timeline & Animations

**Priority**: P1 | **Estimate**: 3 days | **Sprint**: 5

**As a** mobile user (candidate or recruiter)  
**I want** a touch-optimized timeline experience  
**So that** I can manage applications efficiently on mobile devices

### Acceptance Criteria

**Mobile Optimizations**:

- [ ] Vertical timeline layout on screens <768px
- [ ] Touch-friendly tap targets (min 44x44px)
- [ ] Swipe gestures to navigate between stages (optional)
- [ ] Collapsible stage headers (accordion pattern)
- [ ] Bottom sheet for actions (replaces modals on mobile)
- [ ] Reduced visual complexity (hide less important metadata)
- [ ] Optimized images and lazy loading

**Animations** (Framer Motion):

- [ ] Stage entry animations (fade + slide)
- [ ] Status badge transitions (color changes)
- [ ] Progress bar animations (width transitions)
- [ ] Action button hover/press states
- [ ] Scroll-snap smooth scrolling
- [ ] Skeleton loading for async data

### Technical Details

**Responsive Breakpoints**:

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      sm: '640px',
      md: '768px', // Switch to vertical timeline
      lg: '1024px',
      xl: '1280px',
    },
  },
};
```

**Framer Motion Variants**:

```typescript
const stageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const progressVariants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 1, ease: 'easeInOut' },
  }),
};
```

**Files to Create/Modify**:

- `src/components/timeline/ApplicationTimeline.tsx` (MODIFY - add responsive logic)
- `src/components/timeline/MobileTimelineView.tsx` (NEW)
- `src/components/ui/MobileBottomSheet.tsx` (NEW)
- `src/utils/animationVariants.ts` (NEW)

---

## Story 5.11: Security Audit & Testing

**Priority**: P0 | **Estimate**: 2 days | **Sprint**: 5

**As a** security-conscious platform  
**I want** comprehensive security validation of stage-based timeline  
**So that** role-based access controls prevent data leaks and unauthorized actions

### Acceptance Criteria

**Security Validations**:

- [ ] Server-side role validation on ALL stage-related mutations
- [ ] Candidate cannot see recruiter-only stages or data
- [ ] Candidate cannot modify stage status directly (only through allowed actions)
- [ ] Recruiter can see all stages but candidate actions respect permissions
- [ ] Stage data filtering happens server-side (never client-side)
- [ ] Stage visibility rules enforced in repository layer
- [ ] Authorization checks on file uploads (Azure Storage signed URLs with expiry)
- [ ] SQL/NoSQL injection protection in all queries
- [ ] Rate limiting on stage creation (prevent spam)

**Testing Checklist**:

- [ ] Unit tests for StageService (all methods)
- [ ] Integration tests for tRPC procedures
- [ ] E2E tests for critical flows (assignment, interview, offer)
- [ ] Security penetration testing (role escalation attempts)
- [ ] Manual testing of all candidate/recruiter scenarios
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile device testing (iOS, Android)
- [ ] Performance testing (timeline with 10+ stages)

### Technical Details

**Security Testing Script**:

```typescript
// __tests__/security/stage-access-control.test.ts
describe('Stage Access Control', () => {
  it('prevents candidate from accessing recruiter-only stages', async () => {
    // Attempt to fetch recruiter-only stage as candidate
    // Expect: 403 Forbidden or filtered result
  });

  it('prevents candidate from updating stage status directly', async () => {
    // Attempt to call updateStageStatus as candidate
    // Expect: 403 Forbidden
  });

  it('enforces stage visibility rules', async () => {
    // Fetch stages as candidate
    // Verify: only visibleTo: ['candidate'] stages returned
  });
});
```

**Files to Create/Modify**:

- `__tests__/services/stageService.test.ts` (NEW)
- `__tests__/security/stage-access-control.test.ts` (NEW)
- `__tests__/e2e/application-timeline.spec.ts` (NEW - Playwright)
- `docs/STAGE_SECURITY_ANALYSIS.md` (NEW)

---

## Story 5.12: Documentation & Deployment

**Priority**: P1 | **Estimate**: 2 days | **Sprint**: 5

**As a** development team  
**I want** comprehensive documentation and smooth deployment  
**So that** future development and maintenance are efficient

### Acceptance Criteria

**Documentation**:

- [ ] Architecture decision record (ADR) for stage-based model
- [ ] API documentation for all stage-related procedures
- [ ] Component usage guide with examples
- [ ] Database schema documentation with ER diagrams
- [ ] Migration guide for existing applications
- [ ] Troubleshooting guide for common issues
- [ ] Performance optimization guide
- [ ] User guide for recruiters (how to create workflows)

**Deployment**:

- [ ] Staging deployment with full smoke testing
- [ ] Production database backup before migration
- [ ] Migration dry-run on production replica
- [ ] Rollback plan documented and tested
- [ ] Feature flag for gradual rollout (10% → 50% → 100%)
- [ ] Monitoring dashboards for stage operations
- [ ] Alert configuration for errors/anomalies
- [ ] Post-deployment verification checklist

### Technical Details

**Documentation Files**:

- `docs/STAGE_ARCHITECTURE.md` (ADR)
- `docs/STAGE_API_REFERENCE.md` (API docs)
- `docs/STAGE_COMPONENT_GUIDE.md` (Component examples)
- `docs/STAGE_MIGRATION_GUIDE.md` (Migration steps)
- `docs/STAGE_TROUBLESHOOTING.md` (Common issues)
- `docs/RECRUITER_WORKFLOW_GUIDE.md` (User guide)

**Deployment Checklist**:

```markdown
# Pre-Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit complete
- [ ] Performance benchmarks met (<3s timeline load)
- [ ] Database migration tested on replica

# Deployment

- [ ] Database backup created
- [ ] Feature flag enabled for 10% users
- [ ] Monitor error rates for 24h
- [ ] Gradual rollout to 50% after 24h
- [ ] Full rollout after 48h if stable

# Post-Deployment

- [ ] Smoke tests on production
- [ ] Monitor Sentry for errors
- [ ] Check database migration success rate
- [ ] User feedback collection
- [ ] Performance monitoring (Lighthouse, Vercel Analytics)
```

---
