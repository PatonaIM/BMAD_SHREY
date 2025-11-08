# Epic 5: Sprint Checklists

This document contains detailed checklists for each sprint to track progress and ensure nothing is missed.

---

## 📋 Sprint 1: Foundation - Data Model & Services

**Duration**: Weeks 1-2  
**Goal**: Establish stage-based data model and service layer

### Pre-Sprint Setup

- [ ] Development environment set up
- [ ] MongoDB access configured
- [ ] Staging database available for testing
- [ ] Team has read Epic PRD and architecture docs
- [ ] Sprint planning meeting completed

### Story 5.1: Core Stage Data Model & Migration

#### Week 1: Type Definitions & Migration Script

**Day 1-2: Type Definitions**

- [ ] Create `src/shared/types/applicationStage.ts`
  - [ ] Define `ApplicationStage` interface
  - [ ] Define `StageType` enum
  - [ ] Define `StageStatus` enum
  - [ ] Define all `StageData` types (Assignment, LiveInterview, Offer, etc.)
  - [ ] Define `CandidateAction` and `RecruiterAction` interfaces
- [ ] Update `src/shared/types/application.ts`
  - [ ] Add `stages: ApplicationStage[]` field
  - [ ] Add `currentStageId: string` field
  - [ ] Add `isDisqualified: boolean` field
  - [ ] Add disqualification metadata fields
  - [ ] Mark old fields as deprecated with comments
- [ ] Verify TypeScript compilation (no errors)
- [ ] Code review: Type definitions

**Day 3-4: Migration Script**

- [ ] Create `scripts/migrations/migrate-to-stages.ts`
  - [ ] Implement `migrateApplication()` function
  - [ ] Map old `ApplicationStatus` to new stages
  - [ ] Handle AI interview data migration
  - [ ] Handle timeline events migration
  - [ ] Implement dry-run mode
  - [ ] Implement execute mode
  - [ ] Add progress logging
  - [ ] Add error handling and rollback
- [ ] Create migration validation script
  - [ ] Verify all applications have valid stages
  - [ ] Check for data integrity issues
  - [ ] Generate migration report
- [ ] Test migration on local database (100+ applications)
- [ ] Test migration on staging database
- [ ] Code review: Migration script

**Day 5: Utility Functions & Indexes**

- [ ] Create `src/utils/stageHelpers.ts`
  - [ ] `createStage()` - Stage factory function
  - [ ] `getStageTitle()` - Get display title for stage type
  - [ ] `getStageIcon()` - Get icon for stage type
  - [ ] `isStageComplete()` - Check if stage is completed
  - [ ] `getNextPendingStage()` - Find next pending stage
  - [ ] `sortStagesByOrder()` - Sort stages by order field
- [ ] Create `src/utils/stageValidation.ts`
  - [ ] `validateStageData()` - Validate stage data structure
  - [ ] `validateStageTransition()` - Validate status transitions
  - [ ] `canCreateStage()` - Check business rules
- [ ] Write unit tests for helpers (85%+ coverage)
- [ ] Create MongoDB index creation script
  - [ ] Index on `stages.type`
  - [ ] Index on `stages.status`
  - [ ] Index on `stages.order`
  - [ ] Index on `currentStageId`
  - [ ] Index on `isDisqualified`
- [ ] Code review: Utilities

#### Week 2: Testing & Documentation

**Day 1-2: Unit Tests**

- [ ] `__tests__/utils/stageHelpers.test.ts`
  - [ ] Test all helper functions
  - [ ] Test edge cases (empty arrays, null values)
  - [ ] Test sorting with non-sequential orders
- [ ] `__tests__/utils/stageValidation.test.ts`
  - [ ] Test validation rules
  - [ ] Test invalid inputs
  - [ ] Test business rule enforcement
- [ ] Achieve 85%+ test coverage
- [ ] All tests passing

**Day 3: Migration Testing**

- [ ] Backup staging database
- [ ] Run migration on staging (dry-run)
- [ ] Review migration report
- [ ] Verify sample applications manually
- [ ] Run migration on staging (execute)
- [ ] Verify all applications migrated correctly
- [ ] Performance test: Query time for stages
- [ ] Create rollback script

**Day 4-5: Documentation & Review**

- [ ] Document migration process in README
- [ ] Create migration runbook for production
- [ ] Document rollback procedure
- [ ] Update API documentation with new types
- [ ] Team review: All code and documentation
- [ ] Merge to main branch
- [ ] Tag release: `v1.0.0-epic5-sprint1-story1`

### Story 5.2: Stage Service & Repository Layer

#### Week 1: Repository Implementation

**Day 1-2: Repository Layer**

- [ ] Create `src/data-access/repositories/applicationStageRepo.ts`
  - [ ] `getApplication(id)` - Fetch application with stages
  - [ ] `getStages(applicationId)` - Get all stages
  - [ ] `getStageById(applicationId, stageId)` - Get single stage
  - [ ] `addStage(applicationId, stage)` - Insert new stage
  - [ ] `updateStage(applicationId, stageId, updates)` - Update stage
  - [ ] `deleteStage(applicationId, stageId)` - Remove stage
  - [ ] `updateApplication(applicationId, updates)` - Update app fields
  - [ ] `getStagesByType(applicationId, type)` - Filter by type
  - [ ] `getVisibleStages(applicationId, role)` - Role-based filtering
- [ ] Add proper error handling
- [ ] Add query optimization (projections, indexes)
- [ ] Code review: Repository

**Day 3-5: Service Layer Part 1**

- [ ] Create `src/services/stageService.ts`
  - [ ] Constructor with dependencies
  - [ ] `createStage()` - Create new stage with validation
  - [ ] `updateStageStatus()` - Update status with transition validation
  - [ ] `addStageData()` - Update stage data
  - [ ] `getActiveStage()` - Get current stage
  - [ ] `getStagesByType()` - Filter stages by type
  - [ ] `getVisibleStages()` - Role-based stage filtering
- [ ] Implement business rule validation
  - [ ] Max 3 assignments per application
  - [ ] Max 3 live interviews per application
  - [ ] Max 1 offer per application
  - [ ] Cannot create stages if disqualified
- [ ] Code review: Service (Part 1)

#### Week 2: Service Completion & Testing

**Day 1-2: Service Layer Part 2**

- [ ] Continue `src/services/stageService.ts`
  - [ ] `validateStageCreation()` - Business rules validation
  - [ ] `validateStageTransition()` - State machine validation
  - [ ] `generateCandidateActions()` - Dynamic action generation
  - [ ] `generateRecruiterActions()` - Dynamic action generation
  - [ ] `calculateNewStageOrder()` - Order calculation for insertions
  - [ ] `advanceToNextStage()` - Progress to next pending stage
- [ ] Implement custom error classes
  - [ ] `InvalidTransitionError`
  - [ ] `MaxStagesError`
  - [ ] `StageNotFoundError`
- [ ] Integration with TimelineService for audit events
- [ ] Code review: Service (Part 2)

**Day 3-4: Testing**

- [ ] `__tests__/repositories/applicationStageRepo.test.ts`
  - [ ] Test all repository methods
  - [ ] Test error cases
  - [ ] Test MongoDB queries
- [ ] `__tests__/services/stageService.test.ts`
  - [ ] Test stage creation (valid and invalid)
  - [ ] Test status transitions (all combinations)
  - [ ] Test business rule enforcement
  - [ ] Test action generation
  - [ ] Test error handling
  - [ ] Mock repository dependencies
- [ ] Integration tests
  - [ ] Test service + repository together
  - [ ] Test with real MongoDB (in-memory or test DB)
- [ ] Achieve 85%+ test coverage
- [ ] All tests passing

**Day 5: Documentation & Review**

- [ ] Document StageService API
- [ ] Add JSDoc comments to all public methods
- [ ] Create usage examples
- [ ] Update architecture documentation
- [ ] Team review: All code
- [ ] Merge to main branch
- [ ] Tag release: `v1.0.0-epic5-sprint1-complete`

### Sprint 1 Definition of Done

- [ ] All TypeScript types defined and documented
- [ ] Migration script tested on staging
- [ ] StageService fully implemented
- [ ] ApplicationStageRepository complete
- [ ] All unit tests passing (85%+ coverage)
- [ ] Integration tests passing
- [ ] MongoDB indexes created
- [ ] API contracts documented
- [ ] Code reviewed and approved
- [ ] Merged to main branch
- [ ] Migration runbook ready for production

---

## 🎨 Sprint 2: UI Foundation & Assignments

**Duration**: Weeks 3-4  
**Goal**: Build timeline UI and implement assignment workflow

### Pre-Sprint Setup

- [ ] Sprint 1 completed and verified
- [ ] Design mockups reviewed
- [ ] Component library (shadcn/ui) available
- [ ] Storybook set up

### Story 5.3: Timeline UI Component Refactor

#### Week 1: Core Timeline Components

**Day 1-2: Container Components**

- [ ] Create `src/components/timeline/ApplicationTimeline.tsx`
  - [ ] Accept props: `applicationId`, `viewAs` (candidate/recruiter)
  - [ ] Implement `useStages()` hook integration
  - [ ] Render timeline header with progress bar
  - [ ] Map stages to TimelineStage components
  - [ ] Auto-scroll to active stage on mount
  - [ ] Handle loading state with skeleton screens
  - [ ] Handle error state
  - [ ] Handle empty state
- [ ] Create `src/hooks/useStages.ts`
  - [ ] Fetch stages via tRPC
  - [ ] Handle loading and error states
  - [ ] Provide refetch function
  - [ ] Cache with SWR or React Query
- [ ] Test ApplicationTimeline rendering
- [ ] Code review: Container

**Day 3-5: Stage Components**

- [ ] Create `src/components/timeline/TimelineStage.tsx`
  - [ ] Accept props: `stage`, `isActive`, `isLast`, `viewAs`
  - [ ] Render stage icon (type-specific)
  - [ ] Render stage header (title, status badge)
  - [ ] Render stage content (data display)
  - [ ] Render stage actions (conditional on role)
  - [ ] Render stage footer (timestamps, actor)
  - [ ] Expand/collapse functionality
  - [ ] Auto-expand if active
  - [ ] Animations (Framer Motion)
- [ ] Create `src/components/timeline/StageIcon.tsx`
  - [ ] Icon mapping for each StageType
  - [ ] Status-based color coding
  - [ ] Animation for active stage
- [ ] Create `src/components/timeline/StageProgress.tsx`
  - [ ] Visual progress indicator
  - [ ] Status badges (pending, in_progress, completed, etc.)
  - [ ] Completion checkmark
- [ ] Test all stage components
- [ ] Code review: Stage components

#### Week 2: Actions & Polish

**Day 1-2: Action Components**

- [ ] Create `src/components/timeline/StageActions.tsx`
  - [ ] Accept props: `candidateActions`, `recruiterActions`, `viewAs`
  - [ ] Render action buttons
  - [ ] Handle button click → modal opening
  - [ ] Disabled state with tooltips
  - [ ] Primary vs. secondary styling
  - [ ] Confirmation dialogs for destructive actions
- [ ] Create `src/hooks/useStageActions.ts`
  - [ ] Action handler functions
  - [ ] Modal state management
  - [ ] tRPC mutation calls
  - [ ] Error handling
  - [ ] Optimistic updates

**Day 3-4: Responsive & Accessibility**

- [ ] Mobile responsive design
  - [ ] Vertical timeline layout
  - [ ] Touch-friendly buttons
  - [ ] Responsive typography
- [ ] Accessibility
  - [ ] ARIA labels on all interactive elements
  - [ ] Keyboard navigation (Tab, Enter, Escape)
  - [ ] Focus management for modals
  - [ ] Screen reader announcements
  - [ ] Color contrast checks (WCAG AA)
- [ ] Dark mode support
  - [ ] All components styled for dark mode
  - [ ] Test in both modes
- [ ] Run accessibility audit (axe-core)

**Day 5: Storybook & Testing**

- [ ] Storybook stories for all components
  - [ ] ApplicationTimeline (various states)
  - [ ] TimelineStage (all stage types)
  - [ ] StageActions (candidate vs. recruiter)
  - [ ] StageProgress (all statuses)
  - [ ] StageIcon (all types)
- [ ] Component tests with Vitest + RTL
  - [ ] Rendering tests
  - [ ] Interaction tests
  - [ ] Accessibility tests
- [ ] Visual regression tests (Chromatic)
- [ ] Code review: UI components
- [ ] Merge to main branch

### Story 5.4: Assignment Stage Implementation

#### Week 1: Backend Implementation

**Day 1-2: tRPC Procedures (Recruiter)**

- [ ] Update `src/services/trpc/recruiterRouter.ts`
  - [ ] `giveAssignment` procedure
    - [ ] Input validation (Zod schema)
    - [ ] Authorization check (recruiter role)
    - [ ] Create assignment stage via StageService
    - [ ] Upload document to Azure Storage (if file)
    - [ ] Return created stage
  - [ ] `submitAssignmentFeedback` procedure
    - [ ] Input validation
    - [ ] Authorization check
    - [ ] Update stage data with feedback
    - [ ] Update stage status to completed
    - [ ] Notify candidate
  - [ ] `cancelAssignment` procedure
    - [ ] Authorization check
    - [ ] Verify stage status is pending
    - [ ] Update stage status to skipped
- [ ] Write integration tests for procedures
- [ ] Code review: Recruiter procedures

**Day 3-4: tRPC Procedures (Candidate)**

- [ ] Update `src/services/trpc/candidateRouter.ts`
  - [ ] `uploadAssignmentAnswer` procedure
    - [ ] Input validation
    - [ ] Authorization check (owns application)
    - [ ] Upload file to Azure Storage
    - [ ] Update stage data with answerUrl
    - [ ] Update stage status to awaiting_recruiter
    - [ ] Notify recruiter
  - [ ] `getAssignment` procedure
    - [ ] Authorization check
    - [ ] Return assignment data
    - [ ] Generate signed URL for document download
- [ ] Write integration tests
- [ ] Code review: Candidate procedures

**Day 5: Azure Storage Integration**

- [ ] Create upload utility functions
  - [ ] `generateUploadUrl()` - Signed URL for upload
  - [ ] `uploadFile()` - Direct upload to Azure
  - [ ] `getDownloadUrl()` - Signed URL for download
- [ ] Handle file validation (size, type)
- [ ] Handle upload progress tracking
- [ ] Handle upload errors and retries
- [ ] Test with real Azure Storage account
- [ ] Code review: Storage integration

#### Week 2: Frontend Implementation

**Day 1-2: Recruiter Components**

- [ ] Create `src/components/recruiter/actions/GiveAssignmentModal.tsx`
  - [ ] Form fields: title, description, document (upload or link), time limit
  - [ ] File picker for document upload
  - [ ] External link input alternative
  - [ ] Form validation
  - [ ] Submit handler (tRPC mutation)
  - [ ] Success/error handling
  - [ ] Upload progress indicator
- [ ] Create `src/components/recruiter/actions/AssignmentFeedbackModal.tsx`
  - [ ] Star rating component (1-5 stars)
  - [ ] Comments textarea
  - [ ] Form validation
  - [ ] Submit handler
  - [ ] Success feedback
- [ ] Create `src/components/recruiter/lists/AssignmentListView.tsx`
  - [ ] List all assignments for application
  - [ ] Status badges
  - [ ] View submission button
  - [ ] Provide feedback button
- [ ] Test recruiter components
- [ ] Code review: Recruiter UI

**Day 3-4: Candidate Components**

- [ ] Create `src/components/candidate/stages/AssignmentStage.tsx`
  - [ ] Display assignment title and description
  - [ ] Download assignment document button
  - [ ] Time limit countdown (if applicable)
  - [ ] Upload answer section
  - [ ] Feedback display (once provided)
  - [ ] Status indicators
- [ ] Create `src/components/candidate/actions/UploadAssignmentModal.tsx`
  - [ ] File picker (PDF, DOC, images)
  - [ ] File size validation (max 5MB)
  - [ ] Upload progress bar
  - [ ] Submit button
  - [ ] Success confirmation
- [ ] Create `src/hooks/useAssignment.ts`
  - [ ] Upload mutation
  - [ ] Fetch assignment query
  - [ ] Error handling
- [ ] Test candidate components
- [ ] Code review: Candidate UI

**Day 5: E2E Testing & Polish**

- [ ] E2E test: Full assignment workflow
  - [ ] Recruiter creates assignment
  - [ ] Candidate receives assignment
  - [ ] Candidate uploads answer
  - [ ] Recruiter views submission
  - [ ] Recruiter provides feedback
  - [ ] Candidate views feedback
- [ ] Test edge cases
  - [ ] File upload failure and retry
  - [ ] Network interruption
  - [ ] Large file upload
  - [ ] Multiple assignments (up to 3)
- [ ] Performance testing
  - [ ] File upload speed
  - [ ] UI responsiveness
- [ ] Bug fixes and polish
- [ ] Code review: Full story
- [ ] Merge to main branch
- [ ] Tag release: `v1.0.0-epic5-sprint2-complete`

### Sprint 2 Definition of Done

- [ ] Timeline UI fully functional
- [ ] All stage types render correctly
- [ ] Assignment workflow complete (end-to-end)
- [ ] File upload to Azure Storage working
- [ ] All components responsive and accessible
- [ ] Dark mode implemented
- [ ] Storybook documentation complete
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Deployed to staging for UAT

---

## 📅 Sprint 3: Live Interviews & Offers

**Duration**: Weeks 5-6  
**Goal**: Implement interview scheduling and offer management

### Pre-Sprint Setup

- [ ] Sprint 2 completed and UAT passed
- [ ] Epic 4 Google Calendar integration verified
- [ ] Google Calendar API credentials available
- [ ] Epic 4 CallScheduler component available

### Story 5.5: Live Interview Stage Implementation

#### Week 1: Backend & Google Calendar Integration

**Day 1-2: Interview Scheduling Backend**

- [ ] Update `src/services/trpc/recruiterRouter.ts`
  - [ ] `scheduleInterview` procedure
    - [ ] Input validation
    - [ ] Create interview stage
    - [ ] Create scheduledCall record (Epic 4)
    - [ ] Create Google Calendar event
    - [ ] Generate Google Meet link
    - [ ] Link stage to scheduledCall
  - [ ] `submitInterviewFeedback` procedure
    - [ ] Update stage with feedback
    - [ ] Mark interview as completed
  - [ ] `cancelInterview` procedure
    - [ ] Cancel Google Calendar event
    - [ ] Update stage status to skipped
- [ ] Integration with GoogleCalendarService (Epic 4)
  - [ ] Verify Calendar API working
  - [ ] Test event creation
  - [ ] Test Meet link generation
- [ ] Code review: Interview backend

**Day 3-4: Candidate Interview Actions**

- [ ] Update `src/services/trpc/candidateRouter.ts`
  - [ ] `bookInterviewSlot` procedure
    - [ ] Select slot from available times
    - [ ] Create Google Calendar event
    - [ ] Update stage status to in_progress
    - [ ] Send confirmation email
  - [ ] `requestReschedule` procedure
    - [ ] Validate >24h before interview
    - [ ] Create reschedule request
    - [ ] Notify recruiter
    - [ ] Update stage data
- [ ] Write integration tests
- [ ] Test Calendar API integration
- [ ] Code review: Candidate interview backend

**Day 5: Calendar Sync & Notifications**

- [ ] Implement calendar sync logic
  - [ ] Sync scheduledCall status with stage status
  - [ ] Handle calendar event updates
  - [ ] Handle event cancellations
- [ ] Email notifications
  - [ ] Interview scheduled confirmation
  - [ ] Interview reminder (24h before)
  - [ ] Reschedule request notification
  - [ ] Interview completion notification
- [ ] Test notification delivery
- [ ] Code review: Sync & notifications

#### Week 2: Frontend Implementation

**Day 1-2: Recruiter Interview Components**

- [ ] Create `src/components/recruiter/actions/ScheduleInterviewModal.tsx`
  - [ ] Reuse CallScheduler component from Epic 4
  - [ ] Interview title and description fields
  - [ ] Duration selector
  - [ ] Available slots selector (from Calendar API)
  - [ ] Submit handler
  - [ ] Integration with Google Calendar
- [ ] Update interview stage display for recruiter
  - [ ] Show scheduled time and Meet link
  - [ ] Show interview status
  - [ ] Provide feedback button
  - [ ] Cancel interview button
- [ ] Create `src/hooks/useLiveInterview.ts`
  - [ ] Schedule mutation
  - [ ] Feedback mutation
  - [ ] Cancel mutation
- [ ] Test recruiter interview UI
- [ ] Code review: Recruiter interview UI

**Day 3-4: Candidate Interview Components**

- [ ] Create `src/components/candidate/stages/LiveInterviewStage.tsx`
  - [ ] Display interview details
  - [ ] Slot picker (if awaiting_candidate)
  - [ ] Scheduled time and Meet link (if booked)
  - [ ] Join interview button (opens Meet link)
  - [ ] Reschedule request button
  - [ ] Feedback display
- [ ] Create `src/components/candidate/actions/InterviewSlotPicker.tsx`
  - [ ] Calendar view of available slots
  - [ ] Time zone selector
  - [ ] Slot selection
  - [ ] Confirm button
- [ ] Create `src/components/candidate/actions/RescheduleRequestModal.tsx`
  - [ ] Reason textarea
  - [ ] Disabled if <24h before interview
  - [ ] Submit handler
- [ ] Test candidate interview UI
- [ ] Code review: Candidate interview UI

**Day 5: E2E Testing & Polish**

- [ ] E2E test: Full interview workflow
  - [ ] Recruiter schedules interview
  - [ ] Candidate books slot
  - [ ] Calendar event created
  - [ ] Candidate joins interview (Meet link works)
  - [ ] Recruiter provides feedback
  - [ ] Candidate views feedback
- [ ] E2E test: Reschedule flow
  - [ ] Candidate requests reschedule
  - [ ] Recruiter receives notification
  - [ ] New slot selected
  - [ ] Calendar updated
- [ ] Test multiple interviews (up to 3)
- [ ] Test time zone handling
- [ ] Bug fixes and polish
- [ ] Code review: Full story
- [ ] Merge to main branch

### Story 5.6: Offer Stage & Acceptance Flow

#### Week 1: Backend Implementation

**Day 1-2: Offer Management Backend**

- [ ] Update `src/services/trpc/recruiterRouter.ts`
  - [ ] `sendOffer` procedure
    - [ ] Upload offer letter to Azure Storage
    - [ ] Create offer stage
    - [ ] Set status to awaiting_candidate
    - [ ] Notify candidate
  - [ ] `revokeOffer` procedure
    - [ ] Verify offer not yet accepted
    - [ ] Update stage status to skipped
    - [ ] Mark application as disqualified
    - [ ] Notify candidate
- [ ] Write integration tests
- [ ] Code review: Offer backend

**Day 3-4: Offer Response Backend**

- [ ] Update `src/services/trpc/candidateRouter.ts`
  - [ ] `respondToOffer` procedure
    - [ ] Input: applicationId, stageId, response (accept/reject), reason?
    - [ ] Update offer stage status
    - [ ] If accepted:
      - [ ] Create offer_accepted stage
      - [ ] Update currentStageId
      - [ ] Send recruiter notification
    - [ ] If rejected:
      - [ ] Mark application as disqualified
      - [ ] Record rejection reason
      - [ ] Send recruiter notification
- [ ] Write integration tests
- [ ] Test state transitions
- [ ] Code review: Offer response backend

**Day 5: Onboarding Stage Setup**

- [ ] Implement offer_accepted stage creation
  - [ ] Welcome message from recruiter
  - [ ] Start date field
  - [ ] Onboarding document checklist
  - [ ] Initial empty onboardingDocuments array
- [ ] Test automatic stage progression
- [ ] Code review: Onboarding setup

#### Week 2: Frontend Implementation

**Day 1-2: Recruiter Offer Components**

- [ ] Create `src/components/recruiter/actions/SendOfferModal.tsx`
  - [ ] Offer letter file upload
  - [ ] Upload to Azure Storage
  - [ ] Offer expiration date picker (optional)
  - [ ] Submit handler
  - [ ] Success confirmation
- [ ] Create `src/components/recruiter/actions/RevokeOfferModal.tsx`
  - [ ] Confirmation dialog
  - [ ] Reason textarea
  - [ ] Revoke button
- [ ] Create `src/components/recruiter/lists/OfferListView.tsx`
  - [ ] List all offers (pending, accepted, rejected)
  - [ ] Status badges
  - [ ] View offer letter button
  - [ ] Revoke offer button (if pending)
- [ ] Test recruiter offer UI
- [ ] Code review: Recruiter offer UI

**Day 3-4: Candidate Offer Components**

- [ ] Create `src/components/candidate/stages/OfferStage.tsx`
  - [ ] Offer letter viewer (PDF viewer component)
  - [ ] Download offer letter button
  - [ ] Accept/Reject buttons
  - [ ] Rejection reason modal
  - [ ] Acceptance confirmation dialog
- [ ] Create `src/components/candidate/actions/OfferDecisionModal.tsx`
  - [ ] Accept confirmation
    - [ ] Summary of next steps
    - [ ] Onboarding preview
    - [ ] Confirm button
  - [ ] Reject option
    - [ ] Optional reason textarea
    - [ ] Confirm button
- [ ] Create `src/components/shared/PdfViewer.tsx`
  - [ ] Inline PDF viewer
  - [ ] Fallback to download link
  - [ ] Zoom controls
  - [ ] Page navigation
- [ ] Create `src/hooks/useOffer.ts`
  - [ ] Respond to offer mutation
  - [ ] Fetch offer query
- [ ] Test candidate offer UI
- [ ] Code review: Candidate offer UI

**Day 5: E2E Testing & Polish**

- [ ] E2E test: Offer acceptance flow
  - [ ] Recruiter sends offer
  - [ ] Candidate views offer
  - [ ] Candidate accepts offer
  - [ ] Offer accepted stage created
  - [ ] Recruiter notified
- [ ] E2E test: Offer rejection flow
  - [ ] Candidate rejects offer
  - [ ] Application marked as disqualified
  - [ ] Recruiter notified with reason
- [ ] E2E test: Offer revocation
  - [ ] Recruiter revokes offer before candidate responds
  - [ ] Application disqualified
  - [ ] Candidate notified
- [ ] Bug fixes and polish
- [ ] Code review: Full story
- [ ] Merge to main branch
- [ ] Tag release: `v1.0.0-epic5-sprint3-complete`

### Sprint 3 Definition of Done

- [ ] Live interview scheduling fully functional
- [ ] Google Calendar integration working
- [ ] Multiple interviews (up to 3) supported
- [ ] Offer workflow complete
- [ ] PDF viewer working for offer letters
- [ ] State transitions correct (accepted/rejected)
- [ ] All notifications sent correctly
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Deployed to staging for UAT

---

## 🎓 Sprint 4: Onboarding & Polish

**Duration**: Weeks 7-8  
**Goal**: Complete onboarding, disqualification, and comprehensive testing

### Pre-Sprint Setup

- [ ] Sprint 3 completed and UAT passed
- [ ] All previous features stable in staging
- [ ] QA environment prepared for full testing

### Story 5.7: Onboarding Document Upload

#### Week 1: Backend & Frontend Implementation

**Day 1-2: Onboarding Backend**

- [ ] Update `src/services/trpc/candidateRouter.ts`
  - [ ] `uploadOnboardingDocument` procedure
    - [ ] Document type validation
    - [ ] File upload to Azure Storage
    - [ ] Update offer_accepted stage data
    - [ ] Add document to onboardingDocuments array
  - [ ] `getOnboardingDocuments` procedure
    - [ ] Return list of uploaded documents
    - [ ] Generate signed download URLs
- [ ] Update `src/services/trpc/recruiterRouter.ts`
  - [ ] `reviewOnboardingDocuments` procedure
    - [ ] Fetch candidate's onboarding documents
    - [ ] Generate signed URLs for download
  - [ ] `markOnboardingComplete` procedure
    - [ ] Update stage: onboardingComplete = true
    - [ ] Set onboardingCompletedAt timestamp
- [ ] Write integration tests
- [ ] Code review: Onboarding backend

**Day 3-4: Onboarding Frontend**

- [ ] Create `src/components/candidate/stages/OfferAcceptedStage.tsx`
  - [ ] Welcome message display
  - [ ] Start date display
  - [ ] Document checklist
    - [ ] Required documents marked
    - [ ] Upload button for each type
    - [ ] Uploaded indicator
  - [ ] Progress bar (uploaded / required)
  - [ ] Document list with file names
- [ ] Create `src/components/candidate/actions/OnboardingDocumentUpload.tsx`
  - [ ] Document type selector
  - [ ] File picker
  - [ ] Upload progress
  - [ ] Success confirmation
- [ ] Create `src/components/recruiter/views/OnboardingDocumentReview.tsx`
  - [ ] List of uploaded documents
  - [ ] Download buttons
  - [ ] Completion status
  - [ ] Mark complete button
- [ ] Create `src/hooks/useOnboarding.ts`
  - [ ] Upload mutation
  - [ ] Fetch documents query
  - [ ] Mark complete mutation
- [ ] Test onboarding components
- [ ] Code review: Onboarding frontend

**Day 5: E2E Testing**

- [ ] E2E test: Full onboarding flow
  - [ ] Candidate accepts offer
  - [ ] Candidate uploads ID proof
  - [ ] Candidate uploads education certificate
  - [ ] Candidate uploads other documents
  - [ ] Recruiter reviews documents
  - [ ] Recruiter marks onboarding complete
- [ ] Test file validation (size, type)
- [ ] Test multiple file uploads
- [ ] Bug fixes
- [ ] Code review: Full story
- [ ] Merge to main branch

### Story 5.8: Disqualification & Journey Termination

#### Week 1: Implementation & Testing

**Day 1-2: Disqualification Backend**

- [ ] Update `src/services/trpc/recruiterRouter.ts`
  - [ ] `disqualifyApplication` procedure
    - [ ] Input: applicationId, reason
    - [ ] Create disqualified stage
    - [ ] Set application.isDisqualified = true
    - [ ] Record disqualification metadata
    - [ ] Set journeyCompletedAt timestamp
    - [ ] Notify candidate
- [ ] Update StageService
  - [ ] Prevent stage creation if disqualified
  - [ ] Prevent status updates if disqualified
- [ ] Write integration tests
- [ ] Code review: Disqualification backend

**Day 3-4: Disqualification Frontend**

- [ ] Create `src/components/recruiter/actions/DisqualifyModal.tsx`
  - [ ] Reason textarea (required)
  - [ ] Confirmation dialog
  - [ ] Warning about irreversibility
  - [ ] Submit button
- [ ] Create `src/components/candidate/stages/DisqualifiedStage.tsx`
  - [ ] "Application Closed" message
  - [ ] Optional feedback from recruiter
  - [ ] Support resources (if applicable)
  - [ ] No further actions available
- [ ] Update timeline rendering
  - [ ] Stop showing future stages if disqualified
  - [ ] Show disqualified stage as final
- [ ] Test disqualification UI
- [ ] Code review: Disqualification frontend

**Day 5: E2E Testing**

- [ ] E2E test: Disqualify at assignment stage
- [ ] E2E test: Disqualify at interview stage
- [ ] E2E test: Disqualify at offer stage
- [ ] Verify no further stages can be added
- [ ] Verify candidate sees appropriate message
- [ ] Bug fixes
- [ ] Code review: Full story
- [ ] Merge to main branch

### Story 5.9: Comprehensive Testing & Bug Fixes

#### Week 2: Full Testing & Polish

**Day 1-2: End-to-End Testing**

- [ ] Complete application journey (happy path)
  - [ ] Submit → AI Interview → Under Review → Assignment → Live Interview → Offer → Accepted → Onboarding
  - [ ] Verify all transitions
  - [ ] Verify all notifications
  - [ ] Verify timeline rendering
- [ ] Multiple assignments workflow
  - [ ] Create 3 assignments
  - [ ] Complete all 3
  - [ ] Verify cannot create 4th
- [ ] Multiple interviews workflow
  - [ ] Schedule 3 interviews
  - [ ] Complete all 3
  - [ ] Verify cannot create 4th
- [ ] Reschedule interview
- [ ] Offer rejection
- [ ] Disqualification at various stages
- [ ] Record test results

**Day 3: Performance Testing**

- [ ] Load testing
  - [ ] Timeline load time with 20+ stages
  - [ ] Application list with 10K applications
  - [ ] File upload (5MB document)
  - [ ] Concurrent users (100) updating different applications
- [ ] Performance benchmarks
  - [ ] API response time <100ms (p95)
  - [ ] UI render time <50ms
  - [ ] File upload time <10s for 5MB
- [ ] Optimization if needed
  - [ ] Query optimization
  - [ ] Index tuning
  - [ ] Component memoization
  - [ ] Lazy loading
- [ ] Record performance metrics

**Day 4: Security & Accessibility Testing**

- [ ] Security audit
  - [ ] Authorization checks on all endpoints
  - [ ] Data leakage tests (candidate A cannot see candidate B)
  - [ ] SQL injection tests (MongoDB)
  - [ ] XSS tests
  - [ ] CSRF protection verified
- [ ] Accessibility testing
  - [ ] Automated: axe-core scan
  - [ ] Manual: Keyboard navigation
  - [ ] Manual: Screen reader (NVDA/JAWS)
  - [ ] Color contrast checks
  - [ ] Focus management
- [ ] Fix any issues found
- [ ] Document security and accessibility compliance

**Day 5: Bug Fixes & Polish**

- [ ] Review all open bugs
- [ ] Prioritize and fix P0/P1 bugs
- [ ] Polish UI/UX
  - [ ] Smooth animations
  - [ ] Consistent spacing
  - [ ] Loading states
  - [ ] Error messages
- [ ] Final code review
- [ ] Update documentation
- [ ] Prepare for UAT

### User Acceptance Testing (UAT)

**Participants**: Product Manager, QA, Key Stakeholders

**Day 1: UAT Session 1**

- [ ] Recruiter workflow demonstration
  - [ ] Create assignments
  - [ ] Schedule interviews
  - [ ] Provide feedback
  - [ ] Send offers
  - [ ] Review onboarding documents
- [ ] Collect feedback
- [ ] Log issues

**Day 2: UAT Session 2**

- [ ] Candidate workflow demonstration
  - [ ] View timeline
  - [ ] Complete assignments
  - [ ] Book interview slots
  - [ ] Accept offer
  - [ ] Upload onboarding documents
- [ ] Collect feedback
- [ ] Log issues

**Day 3: Bug Fixes from UAT**

- [ ] Fix critical issues
- [ ] Re-test
- [ ] Get stakeholder sign-off

**Day 4: Production Preparation**

- [ ] Finalize migration runbook
- [ ] Prepare rollback plan
- [ ] Schedule production deployment
- [ ] Brief support team
- [ ] Create monitoring dashboard

**Day 5: Documentation & Handoff**

- [ ] Update all documentation
  - [ ] User guides (candidate + recruiter)
  - [ ] API documentation
  - [ ] Developer documentation
  - [ ] Troubleshooting guide
- [ ] Record demo videos
- [ ] Prepare release notes
- [ ] Tag release: `v1.0.0-epic5-complete`

### Sprint 4 Definition of Done

- [ ] Onboarding document upload complete
- [ ] Disqualification flow implemented
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Accessibility audit passed
- [ ] UAT completed with sign-off
- [ ] All P0/P1 bugs fixed
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## 🚀 Production Deployment Checklist

### Pre-Deployment (Day Before)

- [ ] All sprints completed and tested
- [ ] Stakeholder sign-off received
- [ ] Backup production database
- [ ] Verify rollback plan
- [ ] Brief support team on new features
- [ ] Schedule deployment window (low traffic time)

### Deployment Day

**Phase 1: Database Migration (Hour 1)**

- [ ] Put application in maintenance mode (optional)
- [ ] Backup production database
- [ ] Run migration script (dry-run)
- [ ] Review migration report
- [ ] Run migration script (execute)
- [ ] Verify migration success
- [ ] Create MongoDB indexes
- [ ] Verify query performance

**Phase 2: Application Deployment (Hour 2)**

- [ ] Deploy new code to production
- [ ] Verify deployment success
- [ ] Run smoke tests
- [ ] Enable feature flag for 10% of users
- [ ] Monitor error logs (Sentry)
- [ ] Monitor performance (Vercel Analytics)

**Phase 3: Gradual Rollout (Days 1-3)**

- [ ] Day 1: 10% of users
  - [ ] Monitor metrics
  - [ ] Check support tickets
  - [ ] Fix critical issues
- [ ] Day 2: 25% of users
  - [ ] Monitor metrics
  - [ ] Check support tickets
- [ ] Day 3: 50% of users
  - [ ] Monitor metrics
  - [ ] Check support tickets

**Phase 4: Full Release (Day 4-5)**

- [ ] Day 4: 75% of users
- [ ] Day 5: 100% of users
- [ ] Remove old timeline code (after 2 weeks)
- [ ] Announce feature to all users
- [ ] Celebrate success! 🎉

### Post-Deployment Monitoring

**Week 1**

- [ ] Daily metrics review
  - [ ] Error rates
  - [ ] API response times
  - [ ] User adoption
  - [ ] Support tickets
- [ ] Address any issues promptly
- [ ] Collect user feedback

**Week 2-4**

- [ ] Weekly metrics review
- [ ] Iterate on feedback
- [ ] Plan future enhancements

---

## 📊 Success Metrics Dashboard

Track these metrics post-deployment:

### Technical Metrics

- [ ] API Response Time: Target <100ms (p95)
- [ ] UI Render Time: Target <50ms
- [ ] Error Rate: Target <0.1%
- [ ] Uptime: Target 99.9%

### User Experience Metrics

- [ ] Time to Complete Application: Measure reduction
- [ ] Candidate Satisfaction: Survey rating >4.0/5.0
- [ ] Recruiter Efficiency: Measure time savings
- [ ] Application Completion Rate: Measure increase

### Business Metrics

- [ ] Time to Hire: Measure reduction
- [ ] Offer Acceptance Rate: Measure increase
- [ ] User Adoption: Track % of applications using new timeline
- [ ] Support Tickets: Monitor increase/decrease

---

**Checklist Version**: 1.0  
**Last Updated**: November 8, 2025  
**Prepared By**: Winston, the Architect 🏗️

**Use these checklists to track progress throughout Epic 5 development!**
