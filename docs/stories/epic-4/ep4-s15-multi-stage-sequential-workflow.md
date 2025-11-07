# EP4-S15: Multi-Stage Interview & Assignment Sequential Management

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S15  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** to schedule multiple sequential interview rounds and assignments in any order with completion tracking,  
**So that** I can implement complex hiring workflows (Phone Screen → Take-Home → Technical Interview → Final Round) while ensuring each stage is completed before the next begins.

---

## Acceptance Criteria

### AC1: Multi-Stage Workflow Architecture

- [ ] Application timeline supports unlimited sequential stages (not parallel)
- [ ] Each stage must be completed before next stage can be initiated
- [ ] Stage types supported:
  - **Interview:** GMeet-based live interview (phone, technical, panel, final)
  - **Assignment:** Take-home task with submission and review
- [ ] Stages can be added in any order: Interview → Assignment → Interview → Assignment
- [ ] Each stage has independent tracking: Pending, Scheduled, In Progress, Completed, Failed
- [ ] Stage sequence numbered automatically (Stage 1, Stage 2, Stage 3, etc.)

### AC2: Stage Creation & Ordering

- [ ] "Add Stage" dropdown button in recruiter timeline quick actions
- [ ] Dropdown options: "Schedule Interview" or "Give Assignment"
- [ ] Stages are always appended to end of current workflow (no reordering after creation)
- [ ] Each new stage appears in timeline as "Stage X: [Type]" with "Pending" status
- [ ] Stage creation blocked if previous stage not completed (error message: "Complete Stage X first")
- [ ] Visual indicator shows workflow progression (e.g., progress bar: "Stage 2 of 4 completed")

### AC3: Interview Stage Details

- [ ] Interview stages use GMeet integration (from EP4-S13)
- [ ] Interview stage configuration:
  - **Stage Type:** Phone Screen, Technical Interview, Hiring Manager Round, Panel Interview, Final Round
  - **Duration:** 30 min, 45 min, 1 hour, 1.5 hours, 2 hours
  - **Interviewers:** Multi-select team members (panel interviews)
  - **Date/Time:** Recruiter selects or offers candidate multiple slots
  - **GMeet Link:** Auto-generated
  - **Custom Instructions:** Optional notes for candidate (e.g., "Prepare to discuss system design")
- [ ] Interview status progression:
  1. **Pending:** Recruiter created stage but not yet scheduled
  2. **Scheduled:** Date/time confirmed, GMeet link sent to candidate
  3. **In Progress:** Interview is happening (optional real-time indicator)
  4. **Completed - Feedback Pending:** Interview finished, awaiting recruiter feedback
  5. **Completed:** Recruiter submitted structured feedback and rating
- [ ] Cannot move to next stage until interview **Completed** (not just "Scheduled")

### AC4: Assignment Stage Details

- [ ] Assignment stages use file upload/link submission (from EP4-S13)
- [ ] Assignment stage configuration:
  - **Assignment Type:** Coding Challenge, Case Study, Design Exercise, Presentation, Writing Sample, Other
  - **Title:** Short name (e.g., "Backend API Design Challenge")
  - **Description:** Full instructions, requirements, deliverables
  - **Materials:** Upload reference files (PDFs, datasets, starter code)
  - **External Link:** Optional link to HackerRank, CodeSignal, GitHub repo template
  - **Deadline:** Date/time picker (1-14 days recommended)
  - **Expected Deliverables:** Text description (e.g., "GitHub repo link + README")
- [ ] Assignment status progression:
  1. **Pending:** Recruiter created stage but not yet sent to candidate
  2. **Active:** Assignment sent to candidate, awaiting submission
  3. **Submitted:** Candidate uploaded files/link, awaiting recruiter review
  4. **Under Review:** Recruiter viewing submission
  5. **Completed:** Recruiter submitted feedback and pass/fail decision
  6. **Revision Requested:** Recruiter asked for improvements (loops back to Active)
- [ ] Cannot move to next stage until assignment **Completed** (not just "Submitted")

### AC5: Sequential Stage Enforcement

- [ ] Stage blocking logic:
  - Stage 2 cannot be initiated until Stage 1 is **Completed**
  - Stage 3 cannot be initiated until Stage 2 is **Completed**
  - And so on for all subsequent stages
- [ ] If recruiter tries to add Stage 3 before Stage 2 is done:
  - Show error modal: "Complete Stage 2: [Name] before adding the next stage"
  - Disable "Add Stage" button with tooltip explanation
- [ ] Visual indicators:
  - Completed stages: Green checkmark ✅
  - Current stage: Yellow/orange "In Progress" indicator 🟡
  - Future stages: Grayed out with lock icon 🔒
- [ ] Timeline clearly shows workflow status: "Stage 2 of 5 In Progress"

### AC6: Stage Completion Requirements

- [ ] **Interview Stage Completion Requires:**
  - Interview date/time has passed (system checks timestamp)
  - Recruiter submitted structured feedback form:
    - Rating (1-5 stars)
    - Technical Skills assessment (1-5)
    - Communication assessment (1-5)
    - Culture Fit assessment (1-5)
    - Written feedback (minimum 50 characters)
    - Recommendation: Strong Yes, Yes, Maybe, No, Strong No
  - "Mark as Complete" checkbox explicitly checked by recruiter
- [ ] **Assignment Stage Completion Requires:**
  - Candidate submitted deliverables (files or link)
  - Recruiter reviewed submission
  - Recruiter submitted structured feedback form:
    - Rating (1-5 stars)
    - Quality assessment (1-5)
    - Completeness assessment (1-5)
    - Approach assessment (1-5)
    - Written feedback (minimum 50 characters)
    - Decision: Pass to Next Stage, Fail (Reject), Request Revision
  - If "Request Revision": Stage loops back to Active, candidate notified
  - If "Pass" or "Fail": Stage marked as Completed

### AC7: Timeline Display for Multi-Stage Workflow

- [ ] Timeline shows all stages with clear visual hierarchy:

  ```
  📅 Stage 1: Phone Screen [Completed ✅]
     → Scheduled for Nov 8, 2PM
     → Completed Nov 8, 2:45PM
     → Feedback: Strong communicator, good cultural fit (4/5)

  📝 Stage 2: Take-Home Challenge [In Progress 🟡]
     → Assigned Nov 9, 10AM
     → Deadline: Nov 12, 11:59PM
     → Status: Submitted, awaiting review

  🔒 Stage 3: Technical Interview [Locked]
     → Complete Stage 2 to unlock

  🔒 Stage 4: Final Round [Locked]
     → Complete Stage 3 to unlock
  ```

- [ ] Each stage card expandable to show detailed history
- [ ] Stage feedback visible to recruiting team but NOT to candidate (private)

### AC8: Candidate Experience for Multi-Stage Workflow

- [ ] Candidate timeline (EP4-S12) shows:
  - Current stage prominently displayed at top
  - Clear instructions for what candidate needs to do next
  - Countdown timers for upcoming interviews or assignment deadlines
  - Completed stages with status (but NOT recruiter feedback details)
  - Future stages visible but grayed out ("Next: Technical Interview after take-home review")
- [ ] Candidate receives notifications:
  - New stage assigned (interview invitation or assignment sent)
  - Stage approaching deadline (24 hours before interview or assignment due)
  - Stage completed (recruiter finished review, moving to next stage)

### AC9: Workflow Templates (Future Enhancement Placeholder)

- [ ] Admin can create common workflow templates:
  - "Standard Engineering": Phone → Take-Home → Technical → Final
  - "Senior Leadership": Phone → Case Study → Panel → Executive Round
  - "Sales Role": Phone → Role-play Exercise → Manager Round
- [ ] Recruiter can apply template to application with one click
- [ ] All stages pre-configured, recruiter only needs to set dates/times

### AC10: Analytics & Reporting

- [ ] Track average stages per role
- [ ] Conversion rates between stages (% candidates passing Stage 1, Stage 2, etc.)
- [ ] Average time spent in each stage type
- [ ] Most common rejection stage
- [ ] Dashboard shows workflow efficiency metrics

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Data Model:**

  ```typescript
  interface HiringStage {
    _id: ObjectId;
    applicationId: ObjectId;
    stageNumber: number; // 1, 2, 3, ...
    stageType: 'interview' | 'assignment';
    status:
      | 'pending'
      | 'scheduled'
      | 'active'
      | 'in_progress'
      | 'submitted'
      | 'under_review'
      | 'completed'
      | 'failed'
      | 'revision_requested';

    // Common fields
    createdAt: Date;
    startedAt?: Date; // When stage became active
    completedAt?: Date;
    createdBy: ObjectId; // Recruiter who created stage

    // Interview-specific fields
    interviewDetails?: {
      interviewType: 'phone' | 'technical' | 'panel' | 'final';
      scheduledTime: Date;
      duration: number; // Minutes
      gmeetLink: string;
      interviewers: ObjectId[];
      instructions?: string;
      feedback?: {
        rating: number;
        technicalScore: number;
        communicationScore: number;
        cultureFitScore: number;
        writtenFeedback: string;
        recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
        reviewedBy: ObjectId;
        reviewedAt: Date;
      };
    };

    // Assignment-specific fields
    assignmentDetails?: {
      assignmentType:
        | 'coding'
        | 'case_study'
        | 'design'
        | 'presentation'
        | 'writing'
        | 'other';
      title: string;
      description: string;
      materialLinks: string[];
      externalLink?: string;
      deadline: Date;
      expectedDeliverables: string;
      submission?: {
        submittedAt: Date;
        fileLinks: string[];
        externalLink?: string;
        notes?: string;
      };
      feedback?: {
        rating: number;
        qualityScore: number;
        completenessScore: number;
        approachScore: number;
        writtenFeedback: string;
        decision: 'pass' | 'fail' | 'revision_requested';
        reviewedBy: ObjectId;
        reviewedAt: Date;
      };
    };
  }
  ```

- [ ] **Business Logic:**

  ```typescript
  // Check if next stage can be added
  function canAddNextStage(applicationId: ObjectId): boolean {
    const stages = getStagesForApplication(applicationId);
    if (stages.length === 0) return true; // First stage always allowed

    const lastStage = stages[stages.length - 1];
    return lastStage.status === 'completed';
  }

  // Check if stage is complete
  function isStageComplete(stage: HiringStage): boolean {
    if (stage.stageType === 'interview') {
      return (
        stage.status === 'completed' &&
        stage.interviewDetails?.feedback !== undefined &&
        stage.scheduledTime < new Date()
      );
    } else if (stage.stageType === 'assignment') {
      return (
        stage.status === 'completed' &&
        stage.assignmentDetails?.feedback !== undefined &&
        stage.assignmentDetails.feedback.decision !== 'revision_requested'
      );
    }
    return false;
  }
  ```

- [ ] **API Endpoints:**
  - `POST /api/recruiter/applications/:appId/stages/interview` - Create interview stage
  - `POST /api/recruiter/applications/:appId/stages/assignment` - Create assignment stage
  - `PUT /api/recruiter/applications/:appId/stages/:stageId/schedule` - Schedule interview
  - `PUT /api/recruiter/applications/:appId/stages/:stageId/send` - Send assignment to candidate
  - `POST /api/recruiter/applications/:appId/stages/:stageId/feedback` - Submit feedback
  - `PUT /api/recruiter/applications/:appId/stages/:stageId/complete` - Mark stage complete
  - `GET /api/recruiter/applications/:appId/stages` - List all stages with status
  - `GET /api/candidate/applications/:appId/stages` - Candidate view of stages (filtered)

- [ ] **Validation Rules:**
  - Cannot create Stage N+1 if Stage N is not completed
  - Cannot mark interview complete if feedback not submitted
  - Cannot mark assignment complete if decision not made
  - Deadline must be future date (cannot be in past)
  - Interview scheduled time must be future (unless rescheduling)

### Frontend Implementation

- [ ] **Components:**
  - `MultiStageWorkflow.tsx` - Container showing all stages
  - `StageProgressIndicator.tsx` - Visual progress bar (1 of 4, 2 of 4, etc.)
  - `AddStageButton.tsx` - Dropdown to add Interview or Assignment
  - `InterviewStageCard.tsx` - Display interview stage details
  - `AssignmentStageCard.tsx` - Display assignment stage details
  - `StageCompletionModal.tsx` - Feedback form for marking complete
  - `StageBlockedMessage.tsx` - Error when trying to add blocked stage
  - `StageFeedbackForm.tsx` - Structured feedback entry

- [ ] **State Management:**
  - React Query for stages CRUD operations
  - Local state for stage creation forms
  - WebSocket updates for candidate submission events
  - Context for application-wide stage progression status

- [ ] **Styling:**
  - Timeline connector lines show workflow flow
  - Color coding: Green (completed), Yellow (in progress), Gray (locked)
  - Lock icon for blocked future stages
  - Progress bar at top of timeline showing % complete

### Testing

- [ ] **Unit Tests:**
  - `canAddNextStage()` logic with various stage states
  - `isStageComplete()` validation for interviews and assignments
  - Stage numbering auto-increment
  - Feedback validation (minimum character count, required fields)

- [ ] **Integration Tests:**
  - API blocks stage creation if previous stage not complete
  - Stage status updates propagate to timeline events
  - Candidate submission triggers status change to "Submitted"
  - Feedback submission marks stage as complete

- [ ] **E2E Tests:**
  - Recruiter creates 4-stage workflow (Interview → Assignment → Interview → Final)
  - Candidate completes Stage 1 interview (feedback submitted)
  - Recruiter adds Stage 2 assignment (now unblocked)
  - Candidate submits Stage 2 (files uploaded)
  - Recruiter reviews and marks complete (unlocks Stage 3)
  - Recruiter cannot add Stage 4 until Stage 3 complete (error shown)

---

## Dependencies

- **Requires:**
  - EP4-S13 (Interview scheduling and assignment infrastructure)
  - EP4-S12 (Candidate timeline view for stage visibility)
- **Blocks:** None (completes multi-stage workflow capability)
- **Related:** EP4-S10 (Notifications for stage transitions)

---

## UX Considerations

### Consult UX Expert For:

- **Progress Visualization:** Linear progress bar vs. circular stages diagram
- **Stage Cards:** Collapsed vs. expanded by default
- **Blocked Stage Messaging:** Error modal vs. inline tooltip vs. disabled button
- **Mobile View:** How to display multi-stage workflow on small screens
- **Feedback Forms:** Inline vs. modal, single-page vs. multi-step
- **Candidate View:** How much detail to show about future stages

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation through stages
- Screen reader support for progress indicators
- Focus management in feedback modals
- Color-blind friendly status indicators (don't rely only on color)

---

## Success Metrics

- **Adoption:** 50% of applications use 2+ stages within 2 months
- **Completion Rate:** 70% of multi-stage workflows complete without candidate drop-off
- **Workflow Complexity:** Average 3.2 stages per application
- **Time-to-Hire:** Multi-stage workflows complete 15% faster than ad-hoc processes
- **Feedback Quality:** 95% of stages have structured feedback submitted

---

## Future Enhancements

- **Parallel Stages:** Support concurrent stages (e.g., multiple panel interviews simultaneously)
- **Conditional Branching:** "If candidate scores <70 on Stage 2, skip Stage 3"
- **Workflow Templates:** Pre-configured stage sequences for common roles
- **Deadline Extensions:** Candidate can request assignment deadline extension
- **Stage Skipping:** Recruiter can skip optional stages with justification
- **AI-Powered Recommendations:** Suggest next stage type based on candidate performance
- **Integration with Calendar:** Auto-suggest interview slots based on recruiter availability

---

## Notes

- Ensure candidates are notified immediately when new stage is assigned
- Consider adding "Skip Stage" option for exceptional candidates (fast-track)
- Assignment revision loop should have maximum 2 iterations (prevent infinite loops)
- Recruiter feedback should be private (never exposed to candidate)
- Track stage-level dropout rates to identify problematic stages in workflow
