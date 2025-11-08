# Epic 5: Dynamic Timeline System - Sprint Plan

**Epic ID**: EP5  
**Planning Date**: November 8, 2025  
**Sprint Duration**: 2 weeks per sprint  
**Total Duration**: 8 weeks (4 sprints)  
**Team Size**: 2-3 developers (1 backend, 1 frontend, 1 full-stack)

---

## 📊 Executive Summary

This sprint plan breaks down Epic 5 (Dynamic Multi-Stage Application Timeline System) into 4 two-week sprints with clear deliverables, dependencies, and acceptance criteria. The plan prioritizes foundational data model changes first, followed by UI implementation, and concludes with advanced features.

### Sprint Overview

| Sprint   | Duration  | Focus Area                  | Stories       | Story Points |
| -------- | --------- | --------------------------- | ------------- | ------------ |
| Sprint 1 | Weeks 1-2 | Data Model & Services       | 5.1, 5.2      | 13           |
| Sprint 2 | Weeks 3-4 | UI Foundation & Assignments | 5.3, 5.4      | 21           |
| Sprint 3 | Weeks 5-6 | Live Interviews & Offers    | 5.5, 5.6      | 17           |
| Sprint 4 | Weeks 7-8 | Onboarding & Polish         | 5.7, 5.8, 5.9 | 13           |

**Total Story Points**: 64  
**Estimated Team Velocity**: 15-17 points per sprint

---

## 🎯 Sprint 1: Foundation - Data Model & Services (Weeks 1-2)

**Goal**: Establish the stage-based data model and service layer to support dynamic timeline functionality.

**Team Capacity**:

- Backend Developer: 40 hours
- Full-Stack Developer: 40 hours

### Stories

#### Story 5.1: Core Stage Data Model & Migration

**Story Points**: 5 | **Priority**: P0 | **Owner**: Backend Dev

**Deliverables**:

- [ ] `src/shared/types/applicationStage.ts` - Complete TypeScript type definitions
- [ ] `src/shared/types/application.ts` - Updated with stages field
- [ ] `scripts/migrations/migrate-to-stages.ts` - Migration script with rollback capability
- [ ] `src/utils/stageHelpers.ts` - Utility functions (createStage, validateStage, etc.)
- [ ] Unit tests for stage utilities (85%+ coverage)
- [ ] MongoDB indexes for stages array queries
- [ ] Migration testing documentation

**Acceptance Criteria**:

- ✅ All TypeScript types compile without errors
- ✅ Migration script successfully converts all existing applications in staging
- ✅ Backward compatibility maintained (old status field preserved)
- ✅ Zero data loss verified through migration validation script
- ✅ Performance tests show <100ms query time for stage lookups

**Dependencies**: None

**Technical Notes**:

```typescript
// Key types to implement
interface ApplicationStage {
  id: string;
  type: StageType;
  order: number;
  status: StageStatus;
  visibleToCandidate: boolean;
  data: StageData;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  candidateActions?: CandidateAction[];
  recruiterActions?: RecruiterAction[];
}

type StageType =
  | 'submit_application'
  | 'ai_interview'
  | 'under_review'
  | 'assignment'
  | 'live_interview'
  | 'offer'
  | 'offer_accepted';
```

**Testing Checklist**:

- [ ] Unit tests for all stage helper functions
- [ ] Integration test for migration script (dry-run mode)
- [ ] Validation test for stage data structures
- [ ] Performance test for stage queries with 1000+ applications

---

#### Story 5.2: Stage Service & Repository Layer

**Story Points**: 8 | **Priority**: P0 | **Owner**: Backend Dev + Full-Stack Dev

**Deliverables**:

- [ ] `src/services/stageService.ts` - Complete StageService class (400+ lines)
- [ ] `src/data-access/repositories/applicationStageRepo.ts` - Repository layer
- [ ] `src/utils/stageValidation.ts` - Business rule validation
- [ ] `__tests__/services/stageService.test.ts` - Comprehensive unit tests
- [ ] Integration tests with MongoDB
- [ ] API documentation for stage operations

**Acceptance Criteria**:

- ✅ All CRUD operations work correctly (create, read, update, delete stages)
- ✅ Business rules enforced (max 3 assignments, max 3 live interviews)
- ✅ Stage transitions validated (cannot skip from pending to completed)
- ✅ Role-based filtering works (candidates see only visible stages)
- ✅ Integration with TimelineService for audit events
- ✅ 85%+ test coverage
- ✅ All error cases handled with specific error types

**Dependencies**: Story 5.1 (must be completed first)

**Key Methods to Implement**:

```typescript
class StageService {
  async createStage(
    applicationId: string,
    stageData: CreateStageInput
  ): Promise<ApplicationStage>;
  async updateStageStatus(
    stageId: string,
    newStatus: StageStatus
  ): Promise<void>;
  async addStageData(stageId: string, data: Partial<StageData>): Promise<void>;
  async getActiveStage(applicationId: string): Promise<ApplicationStage | null>;
  async getStagesByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]>;
  async canProgressToStage(
    applicationId: string,
    stageType: StageType
  ): Promise<boolean>;
  async validateStageTransition(
    currentStatus: StageStatus,
    newStatus: StageStatus
  ): Promise<boolean>;
  async getVisibleStages(
    applicationId: string,
    role: 'candidate' | 'recruiter'
  ): Promise<ApplicationStage[]>;
}
```

**Testing Checklist**:

- [ ] Unit tests for each service method
- [ ] Integration tests with database
- [ ] Error handling tests (invalid transitions, max stages, etc.)
- [ ] Concurrency tests (simultaneous stage updates)
- [ ] Performance tests (bulk operations)

---

### Sprint 1 Definition of Done

- [ ] All TypeScript types defined and documented
- [ ] Migration script tested on staging database
- [ ] StageService fully implemented with 85%+ test coverage
- [ ] All MongoDB indexes created
- [ ] API contracts documented
- [ ] Code reviewed and merged to main branch
- [ ] Migration runbook created for production deployment

### Sprint 1 Risks & Mitigations

**Risk**: Data migration fails in production  
**Mitigation**:

- Dry-run testing on production clone
- Automated rollback script
- Backup verification before migration
- Phased rollout (10% → 50% → 100%)

**Risk**: Performance degradation with stages array  
**Mitigation**:

- Benchmark testing with 10K+ applications
- Proper indexing strategy
- Query optimization
- Caching layer if needed

---

## 🎨 Sprint 2: UI Foundation & Assignments (Weeks 3-4)

**Goal**: Build the visual timeline UI and implement the complete assignment workflow (recruiter + candidate).

**Team Capacity**:

- Frontend Developer: 40 hours
- Full-Stack Developer: 40 hours

### Stories

#### Story 5.3: Timeline UI Component Refactor

**Story Points**: 8 | **Priority**: P0 | **Owner**: Frontend Dev

**Deliverables**:

- [ ] `src/components/timeline/ApplicationTimeline.tsx` - Main container
- [ ] `src/components/timeline/TimelineStage.tsx` - Individual stage component
- [ ] `src/components/timeline/StageActions.tsx` - Action buttons component
- [ ] `src/components/timeline/StageProgress.tsx` - Progress indicator
- [ ] `src/components/timeline/StageIcon.tsx` - Type-specific icons
- [ ] `src/hooks/useStages.ts` - Data fetching hook with SWR/React Query
- [ ] `src/hooks/useStageActions.ts` - Action handlers hook
- [ ] Storybook stories for all components
- [ ] Responsive design (mobile + desktop)
- [ ] Dark mode support

**Acceptance Criteria**:

- ✅ Timeline displays all stages correctly for both candidate and recruiter views
- ✅ Auto-scroll to active stage on page load
- ✅ Smooth animations with Framer Motion
- ✅ Loading states with skeleton screens
- ✅ Empty states handled gracefully
- ✅ Mobile responsive (stacks vertically)
- ✅ Accessibility: keyboard navigation, ARIA labels, focus management
- ✅ Performance: <50ms render time for 10 stages

**Dependencies**: Story 5.2 (Stage Service must provide API)

**Component Architecture**:

```tsx
<ApplicationTimeline applicationId={id} viewAs="candidate">
  <TimelineHeader stats={stageStats} />
  <StageList stages={stages}>
    {stages.map(stage => (
      <TimelineStage key={stage.id} stage={stage}>
        <StageIcon type={stage.type} />
        <StageHeader title={stage.title} status={stage.status} />
        <StageContent data={stage.data} />
        <StageActions
          candidateActions={stage.candidateActions}
          recruiterActions={stage.recruiterActions}
          viewAs={viewAs}
        />
        <StageFooter timestamps={stage} />
      </TimelineStage>
    ))}
  </StageList>
  <TimelineFooter nextSteps={getNextSteps(stages)} />
</ApplicationTimeline>
```

**Design Requirements**:

- Follow existing design system (colors, typography, spacing)
- Match animation style from Epic 4 components
- Reuse button and badge components
- Mobile-first approach

**Testing Checklist**:

- [ ] Component unit tests with Vitest + React Testing Library
- [ ] Visual regression tests with Chromatic
- [ ] Accessibility tests (axe-core)
- [ ] Responsive design tests (multiple viewports)
- [ ] Performance tests (React DevTools Profiler)

---

#### Story 5.4: Assignment Stage Implementation (Candidate + Recruiter)

**Story Points**: 13 | **Priority**: P0 | **Owner**: Full-Stack Dev

**Deliverables**:

**Backend (tRPC Procedures)**:

- [ ] `recruiterRouter.giveAssignment` - Create assignment stage
- [ ] `recruiterRouter.submitAssignmentFeedback` - Provide feedback
- [ ] `recruiterRouter.cancelAssignment` - Cancel before candidate starts
- [ ] `candidateRouter.uploadAssignmentAnswer` - Upload submission
- [ ] `candidateRouter.getAssignment` - Fetch assignment details
- [ ] Input validation with Zod schemas
- [ ] Azure Storage integration for document uploads

**Frontend Components**:

- [ ] `src/components/recruiter/actions/GiveAssignmentModal.tsx`
- [ ] `src/components/recruiter/actions/AssignmentFeedbackModal.tsx`
- [ ] `src/components/recruiter/lists/AssignmentListView.tsx`
- [ ] `src/components/candidate/stages/AssignmentStage.tsx`
- [ ] `src/components/candidate/actions/UploadAssignmentModal.tsx`
- [ ] `src/hooks/useAssignment.ts` - Assignment operations hook
- [ ] File upload progress indicator
- [ ] Rating component (1-5 stars)

**Acceptance Criteria**:

**Recruiter Side**:

- ✅ Can create assignment with title, description, document (upload or link), time limit
- ✅ Document uploads to Azure Storage successfully
- ✅ Assignment appears in timeline at correct position
- ✅ Can create up to 3 assignments per application
- ✅ Can cancel assignment if candidate hasn't started
- ✅ Can view submitted assignment documents
- ✅ Can provide feedback with rating (1-5 stars) and comments
- ✅ Feedback marks stage as completed

**Candidate Side**:

- ✅ Can view assignment details and download document
- ✅ Time limit countdown displays if specified
- ✅ Can upload answer document (PDF, DOC, images up to 5MB)
- ✅ Upload progress indicator works
- ✅ Cannot upload after submission
- ✅ Can view feedback once provided
- ✅ Receives notification when feedback added

**Dependencies**: Story 5.3 (Timeline UI must be ready)

**File Upload Flow**:

```typescript
// Client-side upload flow
1. User selects file → validate size/type
2. Request signed upload URL from backend
3. Upload file directly to Azure Storage
4. Send completion notification to backend
5. Backend updates stage with document URL
6. UI refreshes to show uploaded document
```

**Testing Checklist**:

- [ ] E2E test: Recruiter creates assignment → Candidate uploads → Recruiter provides feedback
- [ ] File upload tests (success, failure, progress)
- [ ] Validation tests (file size, type restrictions)
- [ ] Permission tests (candidate cannot see other candidates' assignments)
- [ ] Error handling tests (network failure, storage failure)
- [ ] Performance test (upload 5MB file)

---

### Sprint 2 Definition of Done

- [ ] Timeline UI fully functional for all stage types
- [ ] Assignment workflow complete (end-to-end)
- [ ] All components responsive and accessible
- [ ] Dark mode implemented
- [ ] File upload integration with Azure Storage working
- [ ] All tests passing (unit, integration, E2E)
- [ ] Storybook documentation complete
- [ ] Code reviewed and deployed to staging

### Sprint 2 Risks & Mitigations

**Risk**: File upload performance issues  
**Mitigation**:

- Direct-to-Azure uploads (no proxy through API)
- Client-side compression for large images
- Progress indicators and cancellation support
- Retry logic for failed uploads

**Risk**: Timeline UI performance with many stages  
**Mitigation**:

- Virtual scrolling for applications with 20+ stages
- Lazy rendering of stage content
- Memoization of stage components
- Performance monitoring with Web Vitals

---

## 📅 Sprint 3: Live Interviews & Offers (Weeks 5-6)

**Goal**: Implement live interview scheduling with Google Calendar integration and complete offer acceptance workflow.

**Team Capacity**:

- Backend Developer: 40 hours
- Frontend Developer: 40 hours

### Stories

#### Story 5.5: Live Interview Stage Implementation

**Story Points**: 8 | **Priority**: P0 | **Owner**: Full-Stack Dev

**Deliverables**:

**Backend (tRPC Procedures)**:

- [ ] `recruiterRouter.scheduleInterview` - Create interview stage + calendar event
- [ ] `recruiterRouter.submitInterviewFeedback` - Post-interview feedback
- [ ] `recruiterRouter.cancelInterview` - Cancel and update calendar
- [ ] `candidateRouter.bookInterviewSlot` - Candidate books available slot
- [ ] `candidateRouter.requestReschedule` - Request reschedule (>24h before)
- [ ] Integration with GoogleCalendarService from Epic 4
- [ ] Sync between scheduledCalls collection and stage data

**Frontend Components**:

- [ ] `src/components/recruiter/actions/ScheduleInterviewModal.tsx` (wraps CallScheduler)
- [ ] `src/components/candidate/stages/LiveInterviewStage.tsx`
- [ ] `src/components/candidate/actions/InterviewSlotPicker.tsx`
- [ ] `src/components/candidate/actions/RescheduleRequestModal.tsx`
- [ ] `src/hooks/useLiveInterview.ts`
- [ ] Calendar view integration
- [ ] Google Meet link display

**Acceptance Criteria**:

**Recruiter Side**:

- ✅ Can schedule interview with available time slots
- ✅ Google Calendar event created with Meet link
- ✅ scheduledCalls record linked to stage
- ✅ Interview stage shows scheduled time and Meet link
- ✅ Can provide feedback after interview completion
- ✅ Can cancel interview before scheduled time
- ✅ Up to 3 live interviews supported per application
- ✅ Calendar updates reflect in Google Calendar

**Candidate Side**:

- ✅ Can view available time slots from recruiter
- ✅ Can book preferred time slot
- ✅ Receives confirmation with Google Meet link
- ✅ Can request reschedule up to 24h before interview
- ✅ Cannot reschedule within 24h (button disabled with tooltip)
- ✅ Can view feedback after interview
- ✅ Receives email/notification reminders

**Dependencies**:

- Epic 4 Google Calendar integration (must be complete)
- Story 5.3 (Timeline UI)

**Epic 4 Integration Points**:

```typescript
// Reuse from Epic 4
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { scheduledCallRepo } from '@/data-access/repositories/scheduledCallRepo';

// Link scheduled call to stage
interface LiveInterviewData {
  scheduledCallId: string; // Reference to scheduledCalls._id
  meetLink?: string;
  scheduledTime?: Date;
  // ... other fields
}
```

**Testing Checklist**:

- [ ] E2E test: Schedule → Book → Complete → Feedback
- [ ] Google Calendar integration test (mock Calendar API)
- [ ] Reschedule request test (within/outside 24h window)
- [ ] Notification tests (reminders, confirmations)
- [ ] Edge case: Interview cancelled after candidate booked
- [ ] Time zone handling tests

---

#### Story 5.6: Offer Stage & Acceptance Flow

**Story Points**: 9 | **Priority**: P0 | **Owner**: Full-Stack Dev

**Deliverables**:

**Backend (tRPC Procedures)**:

- [ ] `recruiterRouter.sendOffer` - Upload offer letter and create offer stage
- [ ] `recruiterRouter.revokeOffer` - Cancel offer before candidate decision
- [ ] `candidateRouter.respondToOffer` - Accept/reject offer
- [ ] `candidateRouter.getOfferLetter` - Fetch offer document (signed URL)
- [ ] Automatic creation of offer_accepted stage on acceptance
- [ ] Application disqualification on rejection
- [ ] Notification system for offer events

**Frontend Components**:

- [ ] `src/components/recruiter/actions/SendOfferModal.tsx`
- [ ] `src/components/recruiter/actions/RevokeOfferModal.tsx`
- [ ] `src/components/recruiter/lists/OfferListView.tsx`
- [ ] `src/components/candidate/stages/OfferStage.tsx`
- [ ] `src/components/candidate/actions/OfferDecisionModal.tsx`
- [ ] `src/components/shared/PdfViewer.tsx` (for offer letter)
- [ ] `src/hooks/useOffer.ts`

**Acceptance Criteria**:

**Recruiter Side**:

- ✅ "Send Offer" button available after interviews/assignments completed
- ✅ Can upload offer letter PDF (Azure Storage)
- ✅ Offer stage created with status: awaiting_candidate
- ✅ Can view pending/accepted/rejected offers in list
- ✅ offer_accepted stage automatically created on acceptance
- ✅ Application marked as disqualified on rejection (with reason)
- ✅ Can revoke offer before candidate decision

**Candidate Side**:

- ✅ Can view offer letter (inline PDF viewer or download)
- ✅ Accept/Reject buttons prominently displayed
- ✅ Rejection requires optional reason (textarea, 500 chars max)
- ✅ Acceptance confirmation dialog with next steps
- ✅ Transitions to "Offer Accepted" stage after acceptance
- ✅ Journey stops with "Application Closed" after rejection
- ✅ Receives notification when offer sent

**Dependencies**: Story 5.3 (Timeline UI)

**State Transitions**:

```typescript
// Offer stage transitions
pending → awaiting_candidate (offer uploaded)
awaiting_candidate → completed (accepted)
awaiting_candidate → skipped (rejected by candidate)
awaiting_candidate → skipped (revoked by recruiter)

// Application state after offer response
accept → isDisqualified: false, currentStageId: offer_accepted_stage_id
reject → isDisqualified: true, disqualificationReason: candidate_reason
```

**Testing Checklist**:

- [ ] E2E test: Send offer → Accept → Onboarding
- [ ] E2E test: Send offer → Reject → Application closed
- [ ] PDF upload and viewing test
- [ ] Revoke offer test (before/after candidate views)
- [ ] Permission test (candidate cannot see other offers)
- [ ] Notification tests (offer sent, decision made)

---

### Sprint 3 Definition of Done

- [ ] Live interview scheduling fully integrated with Google Calendar
- [ ] Offer workflow complete (send, accept, reject, revoke)
- [ ] All stage transitions working correctly
- [ ] Notifications sent for all key events
- [ ] PDF viewer functional for offer letters
- [ ] All tests passing (unit, integration, E2E)
- [ ] Calendar sync verified in production-like environment
- [ ] Code reviewed and deployed to staging

### Sprint 3 Risks & Mitigations

**Risk**: Google Calendar API rate limits  
**Mitigation**:

- Implement exponential backoff
- Cache calendar availability
- Batch calendar operations where possible
- Monitor API usage

**Risk**: Time zone handling errors  
**Mitigation**:

- Use UTC timestamps internally
- Convert to user's timezone in UI
- Extensive testing across timezones
- Clear timezone display in UI

---

## 🎓 Sprint 4: Onboarding & Polish (Weeks 7-8)

**Goal**: Complete onboarding document upload, handle disqualification flows, and polish the entire feature with comprehensive testing.

**Team Capacity**:

- Full-Stack Developer: 40 hours
- QA/Testing: 20 hours

### Stories

#### Story 5.7: Onboarding Document Upload (Offer Accepted Stage)

**Story Points**: 5 | **Priority**: P1 | **Owner**: Full-Stack Dev

**Deliverables**:

**Backend (tRPC Procedures)**:

- [ ] `candidateRouter.uploadOnboardingDocument` - Upload document by type
- [ ] `candidateRouter.getOnboardingDocuments` - Fetch all uploaded docs
- [ ] `recruiterRouter.reviewOnboardingDocuments` - View candidate docs
- [ ] `recruiterRouter.markOnboardingComplete` - Complete onboarding status
- [ ] Azure Storage integration for documents
- [ ] Document type validation

**Frontend Components**:

- [ ] `src/components/candidate/stages/OfferAcceptedStage.tsx`
- [ ] `src/components/candidate/actions/OnboardingDocumentUpload.tsx`
- [ ] `src/components/recruiter/views/OnboardingDocumentReview.tsx`
- [ ] `src/hooks/useOnboarding.ts`
- [ ] Document checklist component
- [ ] Progress indicator for document completion

**Acceptance Criteria**:

**Candidate Side**:

- ✅ Offer Accepted stage displays welcome message
- ✅ Document checklist shows required documents (ID, Education, Other)
- ✅ Can upload documents (PDF, images up to 5MB each)
- ✅ Progress indicator shows uploaded vs required
- ✅ Uploaded documents list with filenames and timestamps
- ✅ Cannot proceed until all required documents uploaded

**Recruiter Side**:

- ✅ Can view onboarding document status
- ✅ Can download uploaded documents
- ✅ Can mark onboarding as complete
- ✅ Receives notification when all documents uploaded

**Dependencies**: Story 5.6 (Offer acceptance must work)

**Document Types**:

```typescript
enum OnboardingDocumentType {
  ID_PROOF = 'id_proof',
  EDUCATION_CERTIFICATE = 'education_certificate',
  BACKGROUND_CHECK = 'background_check',
  TAX_FORMS = 'tax_forms',
  OTHER = 'other',
}

interface OnboardingDocument {
  type: OnboardingDocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  required: boolean;
}
```

**Testing Checklist**:

- [ ] E2E test: Accept offer → Upload all docs → Mark complete
- [ ] File upload validation tests
- [ ] Permission tests (candidate A cannot see candidate B's docs)
- [ ] Document type validation tests
- [ ] Multiple file upload tests

---

#### Story 5.8: Disqualification & Journey Termination

**Story Points**: 3 | **Priority**: P0 | **Owner**: Backend Dev

**Deliverables**:

- [ ] `recruiterRouter.disqualifyApplication` - Disqualify at any stage
- [ ] `src/components/recruiter/actions/DisqualifyModal.tsx`
- [ ] `src/components/candidate/stages/DisqualifiedStage.tsx`
- [ ] Disqualification reason tracking
- [ ] Timeline event for disqualification
- [ ] Notification to candidate

**Acceptance Criteria**:

- ✅ Recruiter can disqualify application at any stage
- ✅ Disqualification requires reason (textarea, 500 chars max)
- ✅ Application marked as isDisqualified: true
- ✅ Candidate sees "Application Closed" message with optional feedback
- ✅ No further stages can be created after disqualification
- ✅ Timeline shows disqualification event
- ✅ Candidate receives notification

**Dependencies**: None (can be done in parallel)

**Testing Checklist**:

- [ ] Disqualify at each stage type (assignment, interview, offer)
- [ ] Verify no stages can be added after disqualification
- [ ] Notification test
- [ ] Permission test (only recruiter can disqualify)

---

#### Story 5.9: Comprehensive Testing & Bug Fixes

**Story Points**: 5 | **Priority**: P0 | **Owner**: Full-Stack Dev + QA

**Deliverables**:

- [ ] End-to-end test suite covering all happy paths
- [ ] End-to-end test suite covering error scenarios
- [ ] Performance testing report
- [ ] Security audit report
- [ ] Bug fix list and resolution
- [ ] Regression test suite
- [ ] User acceptance testing (UAT) with stakeholders

**Test Scenarios**:

**Happy Path Tests**:

1. Complete application journey: Submit → AI Interview → Assignment → Live Interview → Offer → Accepted → Onboarding
2. Multiple assignments (3) with feedback
3. Multiple live interviews (3) with feedback
4. Reschedule interview request
5. Offer rejection by candidate

**Error Scenarios**:

1. File upload failure and retry
2. Calendar API failure during interview scheduling
3. Concurrent stage updates by recruiter
4. Network failure during stage transition
5. Invalid stage transition attempts

**Permission Tests**:

1. Candidate cannot see recruiter-only data
2. Candidate A cannot see candidate B's application
3. Non-recruiter cannot create stages
4. Disqualified application cannot be modified

**Performance Tests**:

1. Timeline load time with 20+ stages
2. Application list query time with 10K applications
3. File upload time for 5MB document
4. Concurrent users (100) updating different applications

**Acceptance Criteria**:

- ✅ All E2E tests passing
- ✅ No P0 or P1 bugs remaining
- ✅ Performance benchmarks met (<100ms API response, <50ms UI render)
- ✅ Security audit passed (no data leaks, proper authorization)
- ✅ UAT completed with stakeholder sign-off

**Testing Checklist**:

- [ ] E2E test suite (Playwright/Cypress)
- [ ] Load testing (k6/Artillery)
- [ ] Security testing (OWASP ZAP)
- [ ] Accessibility testing (axe-core, manual testing)
- [ ] Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS, Android)

---

### Sprint 4 Definition of Done

- [ ] Onboarding document upload complete
- [ ] Disqualification flow implemented
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] UAT sign-off received
- [ ] Documentation updated (API docs, user guide)
- [ ] Ready for production deployment

### Sprint 4 Risks & Mitigations

**Risk**: Critical bugs discovered during UAT  
**Mitigation**:

- Continuous testing throughout sprints
- Daily bug triage and prioritization
- Buffer time built into sprint 4
- Rollback plan if needed

**Risk**: Performance issues at scale  
**Mitigation**:

- Load testing early and often
- Database query optimization
- Caching strategy implemented
- CDN for static assets

---

## 📈 Success Metrics & KPIs

### Technical Metrics

- **API Response Time**: <100ms (p95)
- **UI Render Time**: <50ms for timeline with 10 stages
- **Test Coverage**: >85% for all new code
- **Zero Data Loss**: During migration and production use
- **Uptime**: 99.9% for timeline features

### User Experience Metrics

- **Time to Complete Application**: Reduced by 30% (self-service actions)
- **Candidate Satisfaction**: >4.0/5.0 rating for new timeline
- **Recruiter Efficiency**: 40% reduction in time to manage candidates
- **Application Completion Rate**: Increased by 25%

### Business Metrics

- **Time to Hire**: Reduced by 20%
- **Offer Acceptance Rate**: Increased by 15%
- **User Adoption**: 90% of applications use new timeline within 30 days
- **Support Tickets**: <5% increase despite major feature launch

---

## 🚀 Deployment Strategy

### Phased Rollout Plan

**Phase 1: Internal Testing (Week 7)**

- Deploy to staging environment
- Internal team testing
- Performance and load testing
- Bug fixes and optimization

**Phase 2: Beta Release (Week 8)**

- Enable for 10% of applications (feature flag)
- Monitor metrics and user feedback
- Collect bug reports
- Iterate on feedback

**Phase 3: Gradual Rollout (Week 9)**

- 25% of applications
- 50% of applications
- 75% of applications
- Monitor each phase for 2-3 days

**Phase 4: Full Release (Week 10)**

- 100% of applications
- Remove old timeline code (after 2 weeks)
- Announce feature to all users
- Celebrate success! 🎉

### Rollback Plan

- Feature flag to switch back to old timeline
- Database migration rollback script
- Cached old timeline UI (served from CDN)
- Communication plan for users if rollback needed

---

## 📚 Documentation Deliverables

1. **Technical Documentation**
   - API documentation (tRPC procedures)
   - Database schema documentation
   - Architecture decision records (ADRs)
   - Migration runbook

2. **User Documentation**
   - Candidate user guide (how to use new timeline)
   - Recruiter user guide (how to manage stages)
   - FAQ document
   - Video tutorials

3. **Developer Documentation**
   - Setup guide for new developers
   - Component Storybook
   - Testing guide
   - Troubleshooting guide

---

## 🎯 Next Steps After Epic 5

1. **Analytics & Insights**
   - Add analytics tracking for stage transitions
   - Create recruiter dashboard for pipeline insights
   - Candidate journey analytics

2. **Automation**
   - Auto-disqualify candidates who don't respond in X days
   - Auto-reminder emails for pending actions
   - Smart interview scheduling (AI-suggested times)

3. **Advanced Features**
   - Custom stage types (recruiter-defined)
   - Stage templates for common workflows
   - Bulk actions (disqualify multiple candidates)
   - Candidate comparison view

4. **Integrations**
   - Slack notifications for stage updates
   - Export timeline to PDF
   - Integration with external ATS systems

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Next Review**: End of Sprint 1
