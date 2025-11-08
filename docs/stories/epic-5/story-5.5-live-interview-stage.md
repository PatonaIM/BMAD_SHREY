# Story 5.5: Live Interview Stage Implementation

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 8  
**Priority**: P0  
**Sprint**: Sprint 3 (Weeks 5-6)  
**Status**: Draft

---

## 📋 Story Overview

Implement live interview scheduling with full Google Calendar integration, building on Epic 4's calendar infrastructure. This story connects the stage-based system with the existing `scheduledCalls` collection and GoogleCalendarService, enabling seamless interview booking, rescheduling, and feedback.

---

## 🎯 Acceptance Criteria

### Recruiter Side

- ✅ Can schedule interview with available time slots
- ✅ Google Calendar event created with Meet link
- ✅ scheduledCalls record linked to stage
- ✅ Interview stage shows scheduled time and Meet link
- ✅ Can provide feedback after interview completion
- ✅ Can cancel interview before scheduled time
- ✅ Up to 3 live interviews supported per application
- ✅ Calendar updates reflect in Google Calendar

### Candidate Side

- ✅ Can view available time slots from recruiter
- ✅ Can book preferred time slot
- ✅ Receives confirmation with Google Meet link
- ✅ Can request reschedule up to 24h before interview
- ✅ Cannot reschedule within 24h (button disabled with tooltip)
- ✅ Can view feedback after interview
- ✅ Receives email/notification reminders

---

## 📦 Deliverables

### Backend Tasks

- [ ] **Task 1**: Create Recruiter Interview Procedures
  - [ ] Procedure: `recruiterRouter.scheduleInterview`
    - Input: applicationId, title, availableSlots[], duration, meetingType
    - Create live_interview stage with status: awaiting_candidate
    - Store available slots in stage data
    - Create timeline event
    - Send notification to candidate
    - Validate: max 3 live interviews per application
  - [ ] Procedure: `recruiterRouter.submitInterviewFeedback`
    - Input: stageId, rating (1-5), notes, recommendation ('hire' | 'maybe' | 'no_hire')
    - Update stage with feedback data
    - Change status to completed
    - Create timeline event
    - Send notification to candidate
  - [ ] Procedure: `recruiterRouter.cancelInterview`
    - Input: stageId, reason
    - Delete scheduledCall record
    - Delete Google Calendar event
    - Mark stage as skipped
    - Send cancellation notification to candidate

- [ ] **Task 2**: Create Candidate Interview Procedures
  - [ ] Procedure: `candidateRouter.bookInterviewSlot`
    - Input: stageId, selectedSlot (date/time)
    - Validate: slot is in availableSlots array
    - Create scheduledCall record
    - Create Google Calendar event with Meet link
    - Update stage with scheduledCallId, scheduledTime, meetLink
    - Change status from awaiting_candidate to in_progress
    - Create timeline event
    - Send confirmation to both parties
  - [ ] Procedure: `candidateRouter.requestReschedule`
    - Input: stageId, reason
    - Validate: >24h before scheduled time
    - Change status to awaiting_recruiter (reschedule_requested)
    - Store reschedule request in stage data
    - Send notification to recruiter
  - [ ] Procedure: `candidateRouter.getInterview`
    - Input: stageId
    - Return interview details with Meet link
    - Validate: candidate owns application

- [ ] **Task 3**: Integrate with GoogleCalendarService (Epic 4)
  - [ ] Function: `createInterviewCalendarEvent`
    - Use existing GoogleCalendarService from Epic 4
    - Create event with attendees (recruiter + candidate)
    - Include Google Meet conference link
    - Set reminders (24h, 1h before)
    - Return event ID and Meet link
  - [ ] Function: `updateInterviewCalendarEvent`
    - Update existing event (reschedule)
    - Send update notifications via Google Calendar
  - [ ] Function: `deleteInterviewCalendarEvent`
    - Delete event when interview cancelled
    - Send cancellation notifications

- [ ] **Task 4**: Sync with scheduledCalls Collection
  - [ ] Create scheduledCall record when interview booked
  - [ ] Link scheduledCall.\_id to stage.data.scheduledCallId
  - [ ] Keep both records in sync (update/delete)
  - [ ] Maintain backward compatibility with existing calls

- [ ] **Task 5**: Input Validation with Zod
  - [ ] Schema: `scheduleInterviewSchema`
  - [ ] Schema: `bookInterviewSlotSchema`
  - [ ] Schema: `submitInterviewFeedbackSchema`
  - [ ] Schema: `requestRescheduleSchema`
  - [ ] Validate slot dates are in future
  - [ ] Validate duration (15min to 4 hours)
  - [ ] Validate 24h reschedule window

- [ ] **Task 6**: Write Backend Tests
  - [ ] Test: Schedule interview with available slots
  - [ ] Test: Max 3 interviews validation
  - [ ] Test: Book interview slot creates calendar event
  - [ ] Test: Book interview creates scheduledCall record
  - [ ] Test: Cancel interview deletes calendar event
  - [ ] Test: Request reschedule within/outside 24h window
  - [ ] Test: Submit feedback marks interview complete
  - [ ] Test: Authorization checks

### Frontend Tasks

- [ ] **Task 7**: Create Recruiter Components
  - [ ] Component: `ScheduleInterviewModal.tsx`
    - Wrap existing CallScheduler component from Epic 4
    - Form fields: title, duration, meetingType
    - Time slot picker (multi-select for available slots)
    - Integration with recruiter's Google Calendar
    - Submit button calls `recruiterRouter.scheduleInterview`
  - [ ] Component: `InterviewFeedbackModal.tsx`
    - Display interview details (time, duration, Meet link)
    - Star rating input (1-5)
    - Notes textarea (max 1000 chars)
    - Recommendation radio buttons (hire/maybe/no_hire)
    - Submit button calls `recruiterRouter.submitInterviewFeedback`
  - [ ] Component: `InterviewListView.tsx`
    - List view of upcoming/past interviews
    - Columns: Candidate, Position, Scheduled Time, Status, Actions
    - Filter by status: upcoming, completed, cancelled
    - Click row to join meeting or provide feedback

- [ ] **Task 8**: Create Candidate Components
  - [ ] Component: `LiveInterviewStage.tsx`
    - Display interview title and description
    - Show available time slots (before booking)
    - Show scheduled time and Meet link (after booking)
    - Join Meeting button (opens Google Meet)
    - Request Reschedule button (disabled if <24h)
    - Show feedback once provided
  - [ ] Component: `InterviewSlotPicker.tsx`
    - Display available slots grouped by date
    - Interactive slot selection (radio buttons)
    - Show recruiter's timezone
    - Convert to candidate's timezone
    - Confirm selection dialog
  - [ ] Component: `RescheduleRequestModal.tsx`
    - Reason textarea (max 500 chars)
    - Warning message about 24h rule
    - Submit button calls `candidateRouter.requestReschedule`

- [ ] **Task 9**: Create Shared Components
  - [ ] Component: `CalendarEventPreview.tsx`
    - Show event date/time with timezone
    - Show duration
    - Show attendees
    - Show Google Meet link
    - Add to Calendar buttons (Google, Outlook, iCal)
  - [ ] Component: `InterviewCountdown.tsx`
    - Countdown timer to interview start
    - Change color as time approaches (green → yellow → red)
    - Show "Interview is starting" when <5min

- [ ] **Task 10**: Create Custom Hooks
  - [ ] Hook: `useLiveInterview.ts`
    - Functions: scheduleInterview, bookSlot, requestReschedule, submitFeedback, cancelInterview
    - Handle loading states
    - Handle error states
    - Optimistic updates
    - Refresh timeline after actions
  - [ ] Hook: `useInterviewReminders.ts`
    - Show notification 24h before interview
    - Show notification 1h before interview
    - Show notification 5min before interview
    - Use browser Notification API

- [ ] **Task 11**: Write Frontend Tests
  - [ ] Test: ScheduleInterviewModal form validation
  - [ ] Test: InterviewSlotPicker selection
  - [ ] Test: LiveInterviewStage displays correctly
  - [ ] Test: Join Meeting button opens Meet link
  - [ ] Test: Reschedule button disabled within 24h
  - [ ] Test: InterviewFeedbackModal submission
  - [ ] Test: Authorization (candidate cannot see other interviews)

- [ ] **Task 12**: E2E Testing
  - [ ] E2E: Recruiter schedules interview with slots
  - [ ] E2E: Candidate books slot
  - [ ] E2E: Calendar event created in Google Calendar
  - [ ] E2E: Candidate joins meeting via Meet link
  - [ ] E2E: Recruiter provides feedback after interview
  - [ ] E2E: Candidate requests reschedule (>24h)
  - [ ] E2E: Recruiter cancels interview

---

## 🔗 Dependencies

- **Epic 4**: Google Calendar Integration (MUST be completed)
  - Requires: GoogleCalendarService
  - Requires: OAuth flow for calendar access
  - Requires: scheduledCalls collection

- **Story 5.3**: Timeline UI Component (MUST be completed first)
  - Requires: Timeline components to display interview stages

---

## 🏗️ Technical Implementation Details

### Integration with Epic 4 Services

```typescript
// Reuse from Epic 4
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { scheduledCallRepo } from '@/data-access/repositories/scheduledCallRepo';
import { CallScheduler } from '@/components/recruiter/CallScheduler';

// Stage data links to scheduledCall
interface LiveInterviewData {
  scheduledCallId: string; // Reference to scheduledCalls._id
  meetLink?: string;
  scheduledTime?: Date;
  duration?: number;
  availableSlots?: Date[];
  feedback?: {
    rating: number;
    notes: string;
    recommendation: 'hire' | 'maybe' | 'no_hire';
  };
  rescheduleRequest?: {
    requestedAt: Date;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
  };
}
```

### Backend: Schedule Interview Procedure

```typescript
// src/server/routers/recruiterRouter.ts
export const recruiterRouter = router({
  scheduleInterview: protectedProcedure
    .input(scheduleInterviewSchema)
    .mutation(async ({ input, ctx }) => {
      const { applicationId, title, availableSlots, duration, meetingType } =
        input;

      // 1. Authorization check
      const application = await applicationRepo.findById(applicationId);
      if (!application) throw new NotFoundError('Application not found');

      const job = await jobRepo.findById(application.jobId);
      if (job.recruiterId !== ctx.user.id) {
        throw new UnauthorizedError('Not authorized');
      }

      // 2. Business rule: max 3 live interviews
      const existingInterviews = await stageService.getStagesByType(
        applicationId,
        'live_interview'
      );
      if (existingInterviews.length >= 3) {
        throw new MaxStagesExceededError(
          'Maximum 3 live interviews per application'
        );
      }

      // 3. Create live_interview stage
      const stage = await stageService.createStage(
        applicationId,
        {
          type: 'live_interview',
          title,
          status: 'awaiting_candidate',
          visibleToCandidate: true,
          data: {
            availableSlots,
            duration,
            meetingType,
            scheduledCallId: null,
            meetLink: null,
            scheduledTime: null,
            feedback: null,
          },
        },
        ctx.user.id
      );

      // 4. Create timeline event
      await timelineService.logEvent({
        applicationId,
        eventType: 'interview_scheduled',
        performedBy: ctx.user.id,
        metadata: { stageId: stage.id, title },
      });

      // 5. Notify candidate
      await notificationService.send({
        userId: application.candidateId,
        type: 'interview_available',
        data: { applicationId, stageId: stage.id, title },
      });

      return { stage };
    }),
});
```

### Backend: Book Interview Slot Procedure

```typescript
// src/server/routers/candidateRouter.ts
export const candidateRouter = router({
  bookInterviewSlot: protectedProcedure
    .input(bookInterviewSlotSchema)
    .mutation(async ({ input, ctx }) => {
      const { stageId, selectedSlot } = input;

      // 1. Fetch stage
      const stage = await stageRepo.findById(stageId);
      if (!stage) throw new NotFoundError('Stage not found');

      // 2. Authorization check
      const application = await applicationRepo.findById(stage.applicationId);
      if (application.candidateId !== ctx.user.id) {
        throw new UnauthorizedError('Not authorized');
      }

      // 3. Validate slot is available
      const data = stage.data as LiveInterviewData;
      const slotAvailable = data.availableSlots?.some(
        slot => new Date(slot).getTime() === new Date(selectedSlot).getTime()
      );
      if (!slotAvailable) {
        throw new BusinessRuleError('Selected slot is not available');
      }

      // 4. Get recruiter and candidate details
      const job = await jobRepo.findById(application.jobId);
      const recruiter = await userRepo.findById(job.recruiterId);
      const candidate = await userRepo.findById(ctx.user.id);

      // 5. Create Google Calendar event
      const calendarService = new GoogleCalendarService(recruiter.id);
      const calendarEvent = await calendarService.createEvent({
        summary: `Interview: ${job.title} - ${candidate.name}`,
        description: stage.title,
        startTime: new Date(selectedSlot),
        endTime: addMinutes(new Date(selectedSlot), data.duration || 60),
        attendees: [recruiter.email, candidate.email],
        conferenceData: true, // Enable Google Meet
      });

      // 6. Create scheduledCall record
      const scheduledCall = await scheduledCallRepo.create({
        applicationId: stage.applicationId,
        recruiterId: recruiter.id,
        candidateId: candidate.id,
        scheduledAt: new Date(selectedSlot),
        duration: data.duration || 60,
        meetLink: calendarEvent.hangoutLink,
        calendarEventId: calendarEvent.id,
        status: 'scheduled',
        type: data.meetingType || 'technical',
      });

      // 7. Update stage with meeting details
      await stageService.addStageData(
        stageId,
        {
          scheduledCallId: scheduledCall._id.toString(),
          scheduledTime: new Date(selectedSlot),
          meetLink: calendarEvent.hangoutLink,
        },
        ctx.user.id
      );

      await stageService.updateStageStatus(stageId, 'in_progress', ctx.user.id);

      // 8. Create timeline event
      await timelineService.logEvent({
        applicationId: stage.applicationId,
        eventType: 'interview_booked',
        performedBy: ctx.user.id,
        metadata: { stageId, scheduledTime: selectedSlot },
      });

      // 9. Send confirmations
      await notificationService.send({
        userId: recruiter.id,
        type: 'interview_booked',
        data: {
          applicationId: stage.applicationId,
          stageId,
          scheduledTime: selectedSlot,
        },
      });

      await notificationService.send({
        userId: candidate.id,
        type: 'interview_confirmed',
        data: {
          applicationId: stage.applicationId,
          stageId,
          meetLink: calendarEvent.hangoutLink,
        },
      });

      return {
        scheduledCall,
        meetLink: calendarEvent.hangoutLink,
      };
    }),
});
```

### Backend: Request Reschedule Procedure

```typescript
// src/server/routers/candidateRouter.ts
requestReschedule: protectedProcedure
  .input(requestRescheduleSchema)
  .mutation(async ({ input, ctx }) => {
    const { stageId, reason } = input;

    // 1. Fetch stage
    const stage = await stageRepo.findById(stageId);
    if (!stage) throw new NotFoundError('Stage not found');

    // 2. Authorization check
    const application = await applicationRepo.findById(stage.applicationId);
    if (application.candidateId !== ctx.user.id) {
      throw new UnauthorizedError('Not authorized');
    }

    // 3. Validate: >24h before scheduled time
    const data = stage.data as LiveInterviewData;
    if (!data.scheduledTime) {
      throw new BusinessRuleError('Interview not scheduled yet');
    }

    const hoursUntilInterview = differenceInHours(
      new Date(data.scheduledTime),
      new Date()
    );

    if (hoursUntilInterview < 24) {
      throw new BusinessRuleError('Cannot reschedule within 24 hours of interview');
    }

    // 4. Update stage with reschedule request
    await stageService.addStageData(stageId, {
      rescheduleRequest: {
        requestedAt: new Date(),
        reason,
        status: 'pending',
      },
    }, ctx.user.id);

    await stageService.updateStageStatus(stageId, 'awaiting_recruiter', ctx.user.id);

    // 5. Notify recruiter
    const job = await jobRepo.findById(application.jobId);
    await notificationService.send({
      userId: job.recruiterId,
      type: 'reschedule_requested',
      data: { applicationId: stage.applicationId, stageId, reason },
    });

    return { success: true };
  }),
```

### Frontend: LiveInterviewStage Component

```tsx
// src/components/candidate/stages/LiveInterviewStage.tsx
export function LiveInterviewStage({ stage }: { stage: ApplicationStage }) {
  const data = stage.data as LiveInterviewData;
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const { bookSlot, requestReschedule } = useLiveInterview();

  const canReschedule = useMemo(() => {
    if (!data.scheduledTime) return false;
    const hoursUntil = differenceInHours(
      new Date(data.scheduledTime),
      new Date()
    );
    return hoursUntil > 24;
  }, [data.scheduledTime]);

  // Before booking
  if (!data.scheduledTime) {
    return (
      <div className="live-interview-stage">
        <h3 className="text-xl font-semibold">{stage.title}</h3>

        <p className="mt-2 text-gray-700 dark:text-gray-300">
          The recruiter has invited you to an interview. Please select a time
          slot that works for you.
        </p>

        <Button variant="primary" onClick={() => setShowSlotPicker(true)}>
          View Available Times
        </Button>

        <InterviewSlotPicker
          slots={data.availableSlots || []}
          isOpen={showSlotPicker}
          onClose={() => setShowSlotPicker(false)}
          onSelect={slot => bookSlot(stage.id, slot)}
        />
      </div>
    );
  }

  // After booking
  return (
    <div className="live-interview-stage">
      <h3 className="text-xl font-semibold">{stage.title}</h3>

      <CalendarEventPreview
        date={data.scheduledTime}
        duration={data.duration}
        meetLink={data.meetLink}
      />

      <InterviewCountdown scheduledTime={data.scheduledTime} />

      <div className="flex gap-4 mt-4">
        <Button
          variant="primary"
          icon={<VideoCameraIcon />}
          onClick={() => window.open(data.meetLink, '_blank')}
          disabled={!isWithin15MinutesOfStart(data.scheduledTime)}
        >
          Join Meeting
        </Button>

        <Button
          variant="secondary"
          onClick={() => setShowRescheduleModal(true)}
          disabled={!canReschedule}
          tooltip={
            !canReschedule ? 'Cannot reschedule within 24 hours' : undefined
          }
        >
          Request Reschedule
        </Button>
      </div>

      {/* Feedback section */}
      {data.feedback && (
        <div className="feedback mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <h4 className="font-semibold">Interview Feedback</h4>
          <StarRating value={data.feedback.rating} readOnly />
          <p className="mt-2">{data.feedback.notes}</p>
          <Badge
            variant={
              data.feedback.recommendation === 'hire'
                ? 'success'
                : data.feedback.recommendation === 'maybe'
                  ? 'warning'
                  : 'error'
            }
          >
            {data.feedback.recommendation.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      )}

      <RescheduleRequestModal
        stageId={stage.id}
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
      />
    </div>
  );
}
```

### Zod Schemas

```typescript
export const scheduleInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  title: z.string().min(5).max(200),
  availableSlots: z.array(z.date()).min(1).max(10),
  duration: z.number().int().min(15).max(240), // 15min to 4 hours
  meetingType: z
    .enum(['screening', 'technical', 'behavioral', 'final'])
    .optional(),
});

export const bookInterviewSlotSchema = z.object({
  stageId: z.string().uuid(),
  selectedSlot: z.date().refine(date => date > new Date(), {
    message: 'Selected slot must be in the future',
  }),
});

export const requestRescheduleSchema = z.object({
  stageId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export const submitInterviewFeedbackSchema = z.object({
  stageId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().min(10).max(1000),
  recommendation: z.enum(['hire', 'maybe', 'no_hire']),
});
```

---

## 🧪 Testing Strategy

### Backend Unit Tests

```typescript
describe('candidateRouter.bookInterviewSlot', () => {
  it('creates Google Calendar event', async () => {
    const result = await caller.candidate.bookInterviewSlot({
      stageId: 'stage-123',
      selectedSlot: addDays(new Date(), 3),
    });

    expect(result.meetLink).toContain('meet.google.com');
  });

  it('creates scheduledCall record', async () => {
    await caller.candidate.bookInterviewSlot({ ... });

    const scheduledCall = await scheduledCallRepo.findByStageId('stage-123');
    expect(scheduledCall).toBeDefined();
    expect(scheduledCall.status).toBe('scheduled');
  });

  it('prevents reschedule within 24h', async () => {
    // Schedule interview for 23 hours from now
    const scheduledTime = addHours(new Date(), 23);

    await expect(
      caller.candidate.requestReschedule({ stageId: 'stage-123', reason: 'Conflict' })
    ).rejects.toThrow('Cannot reschedule within 24 hours');
  });
});
```

### Frontend Component Tests

```typescript
describe('LiveInterviewStage', () => {
  it('shows available slots before booking', () => {
    const stage = createMockStage({
      data: {
        availableSlots: [addDays(new Date(), 1), addDays(new Date(), 2)],
        scheduledTime: null,
      },
    });

    render(<LiveInterviewStage stage={stage} />);
    expect(screen.getByText(/select a time slot/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view available times/i })).toBeInTheDocument();
  });

  it('disables reschedule button within 24h', () => {
    const stage = createMockStage({
      data: {
        scheduledTime: addHours(new Date(), 23),
      },
    });

    render(<LiveInterviewStage stage={stage} />);
    const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
    expect(rescheduleButton).toBeDisabled();
  });

  it('shows Meet link and join button', () => {
    const stage = createMockStage({
      data: {
        scheduledTime: addDays(new Date(), 1),
        meetLink: 'https://meet.google.com/abc-def-ghi',
      },
    });

    render(<LiveInterviewStage stage={stage} />);
    expect(screen.getByText(/meet.google.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join meeting/i })).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
test('Complete interview workflow', async ({ page }) => {
  // 1. Recruiter schedules interview
  await page.goto('/recruiter/applications/app-123');
  await page.click('button:has-text("Schedule Interview")');
  await page.fill('input[name="title"]', 'Technical Interview');
  // Select multiple time slots
  await page.click('[data-testid="slot-1"]');
  await page.click('[data-testid="slot-2"]');
  await page.click('button:has-text("Send Invite")');

  // 2. Candidate views available slots
  await page.goto('/candidate/applications/app-123');
  await page.click('button:has-text("View Available Times")');
  await expect(page.locator('text=Select a time slot')).toBeVisible();

  // 3. Candidate books slot
  await page.click('[data-testid="slot-1"]');
  await page.click('button:has-text("Confirm Booking")');
  await expect(page.locator('text=Interview confirmed')).toBeVisible();

  // 4. Verify Google Meet link
  await expect(page.locator('a[href*="meet.google.com"]')).toBeVisible();

  // 5. Recruiter provides feedback after interview
  await page.goto('/recruiter/applications/app-123');
  await page.click('button:has-text("Provide Feedback")');
  await page.click('[aria-label="5 stars"]');
  await page.fill('textarea[name="notes"]', 'Excellent technical skills');
  await page.click('input[value="hire"]');
  await page.click('button:has-text("Submit Feedback")');

  // 6. Candidate sees feedback
  await page.goto('/candidate/applications/app-123');
  await expect(page.locator('text=Excellent technical skills')).toBeVisible();
  await expect(page.locator('text=HIRE')).toBeVisible();
});
```

---

## 📊 Validation Checklist

Before marking this story complete:

- [ ] All 12 tasks completed
- [ ] Backend procedures implemented and tested
- [ ] Google Calendar integration working
- [ ] scheduledCalls records created and synced
- [ ] Frontend components implemented
- [ ] Time slot booking working
- [ ] 24h reschedule rule enforced
- [ ] Max 3 interviews validation working
- [ ] Feedback system working
- [ ] E2E test passing
- [ ] Calendar events visible in Google Calendar
- [ ] Unit tests: 85%+ coverage
- [ ] Code reviewed and approved

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

- [ ] Backend procedures in `src/server/routers/recruiterRouter.ts`
- [ ] Backend procedures in `src/server/routers/candidateRouter.ts`
- [ ] `src/components/recruiter/actions/ScheduleInterviewModal.tsx`
- [ ] `src/components/recruiter/actions/InterviewFeedbackModal.tsx`
- [ ] `src/components/recruiter/lists/InterviewListView.tsx`
- [ ] `src/components/candidate/stages/LiveInterviewStage.tsx`
- [ ] `src/components/candidate/actions/InterviewSlotPicker.tsx`
- [ ] `src/components/candidate/actions/RescheduleRequestModal.tsx`
- [ ] `src/components/shared/CalendarEventPreview.tsx`
- [ ] `src/components/shared/InterviewCountdown.tsx`
- [ ] `src/hooks/useLiveInterview.ts`
- [ ] `src/hooks/useInterviewReminders.ts`
- [ ] Tests for all components and procedures

**Modified Files:**

- [ ] None expected (Epic 4 services reused as-is)

### Change Log

_Document significant changes made during implementation_

---

## 📝 Dev Notes

- Reuse Epic 4's GoogleCalendarService - no need to reimplement
- scheduledCalls collection maintains backward compatibility
- 24h reschedule rule prevents last-minute changes
- Max 3 interviews prevents recruiter spam and interview fatigue
- Google Meet links auto-generated by Calendar API
- Reminder notifications improve show-up rates
- Timezone conversion handled automatically by Google Calendar

---

## 🔗 Related Stories

- **Epic 4**: Google Calendar Integration (dependency)
- **Story 5.3**: Timeline UI Component (dependency)
- **Story 5.4**: Assignment Stage (similar feedback patterns)
- **Story 5.6**: Offer Stage (next step after interviews)

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
