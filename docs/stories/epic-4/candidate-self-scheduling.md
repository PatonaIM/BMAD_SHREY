# Candidate Self-Scheduling Feature

**Story ID**: EP4-S7.1  
**Epic**: Epic 4 - Advanced Recruiter Tools  
**Priority**: P1  
**Estimated Effort**: 2-3 days  
**Status**: Ready for Implementation

---

## 📋 Overview

Enable candidates who have completed their AI interview to book a 10-minute time slot directly from subscribed recruiters' calendars. This eliminates the need for back-and-forth scheduling and improves the candidate experience.

---

## 🎯 User Story

**As a** candidate who has completed an AI interview  
**I want to** book a 10-minute call directly from the recruiter's available time slots  
**So that** I can schedule a follow-up conversation without waiting for the recruiter to initiate

---

## 🔑 Acceptance Criteria

### Must Have

1. ✅ **Eligibility Check**: Only candidates who have completed AI interview can access scheduling
2. ✅ **Available Slots**: Display recruiter's available 10-minute slots for next 14 days
3. ✅ **Book Slot**: Candidate can select and book a slot with one click
4. ✅ **Calendar Event**: Creates Google Calendar event on recruiter's calendar
5. ✅ **Meet Link**: Automatically generates Google Meet link
6. ✅ **Email Notifications**: Both candidate and recruiter receive confirmation emails
7. ✅ **Timeline Event**: Booking logged in application timeline
8. ✅ **Booking Limit**: One booking per application (can reschedule if needed)

### Should Have

9. ✅ **Timezone Display**: Show slots in candidate's local timezone
10. ✅ **Booking Confirmation**: Confirmation screen with Meet link after booking
11. ✅ **Cancellation**: Candidate can cancel booking (up to 24 hours before)
12. ✅ **Rescheduling**: Candidate can reschedule (up to 24 hours before)

### Nice to Have

13. ⏳ **Reminder Notifications**: Email reminder 1 hour before call
14. ⏳ **Buffer Time**: Automatic 5-minute buffer between bookings
15. ⏳ **Business Hours Only**: Only show slots during recruiter's work hours (9 AM - 5 PM)

---

## 🏗️ Technical Architecture

### Data Model Changes

#### 1. Application Schema Extension

```typescript
// Add to Application interface
interface Application {
  // ... existing fields
  candidateScheduling?: {
    eligible: boolean; // true after AI interview complete
    hasBooked: boolean; // true after first booking
    lastBooking?: {
      callId: string;
      bookedAt: Date;
      scheduledAt: Date;
    };
  };
}
```

#### 2. ScheduledCall Schema Extension

```typescript
// Add to ScheduledCall interface
interface ScheduledCall {
  // ... existing fields
  bookedBy: 'recruiter' | 'candidate'; // NEW: who initiated booking
  candidateId?: string; // NEW: candidate user ID
  cancellationDeadline: Date; // NEW: 24 hours before scheduled time
  rescheduledFrom?: string; // NEW: callId if this is a reschedule
}
```

#### 3. Recruiter Availability Settings

```typescript
// New collection: recruiterAvailability
interface RecruiterAvailability {
  _id: ObjectId;
  recruiterId: string;
  workingHours: {
    monday: { start: string; end: string }; // e.g., "09:00", "17:00"
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  timezone: string; // e.g., "America/New_York"
  bufferMinutes: number; // default: 5 minutes between calls
  slotDuration: number; // default: 10 minutes for candidate slots
  maxAdvanceBookingDays: number; // default: 14 days
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔧 Backend Implementation

### Step 1: Eligibility Service

**File**: `/src/services/candidateSchedulingService.ts`

```typescript
export class CandidateSchedulingService {
  /**
   * Check if candidate is eligible to book a call
   */
  async checkEligibility(applicationId: string): Promise<{
    eligible: boolean;
    reason?: string;
    application?: Application;
  }> {
    // 1. Get application
    const application = await applicationRepo.findById(applicationId);

    if (!application) {
      return { eligible: false, reason: 'Application not found' };
    }

    // 2. Check AI interview completed
    const hasCompletedInterview = application.interviewScore !== undefined;
    if (!hasCompletedInterview) {
      return {
        eligible: false,
        reason: 'Please complete AI interview first',
        application,
      };
    }

    // 3. Check if already booked (and not cancelled/completed)
    const existingBooking = await scheduledCallRepo.findByApplication(
      applicationId,
      { status: ['scheduled'] }
    );

    if (existingBooking.length > 0) {
      return {
        eligible: false,
        reason: 'You already have a scheduled call',
        application,
      };
    }

    return { eligible: true, application };
  }

  /**
   * Get available time slots for candidate booking
   */
  async getAvailableSlots(
    applicationId: string,
    days: number = 14
  ): Promise<{
    slots: TimeSlot[];
    recruiterName: string;
    timezone: string;
  }> {
    // 1. Get application to find recruiter
    const application = await applicationRepo.findById(applicationId);
    const subscription = await recruiterSubscriptionRepo.findByJob(
      application.jobId
    );

    const recruiterId = subscription[0]?.recruiterId;
    if (!recruiterId) {
      throw new Error('No recruiter assigned to this job');
    }

    // 2. Get recruiter's availability settings
    const availability =
      await recruiterAvailabilityRepo.findByRecruiter(recruiterId);

    // 3. Get recruiter's Google Calendar free/busy
    const recruiterUser = await userRepo.findById(recruiterId);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const freeBusyResult = await googleCalendarService.getFreeBusy(
      recruiterUser.googleAccessToken!,
      startDate,
      endDate,
      recruiterUser.googleRefreshToken
    );

    if (!freeBusyResult.success) {
      throw new Error('Failed to fetch recruiter availability');
    }

    // 4. Get existing bookings
    const existingCalls = await scheduledCallRepo.findScheduledCallsByRecruiter(
      recruiterId,
      { startDate, endDate, status: 'scheduled' }
    );

    // 5. Generate available slots
    const slots = this.generateAvailableSlots(
      freeBusyResult.data!.slots!,
      existingCalls,
      availability,
      startDate,
      endDate
    );

    return {
      slots,
      recruiterName: recruiterUser.name,
      timezone: availability?.timezone || 'UTC',
    };
  }

  /**
   * Book a time slot
   */
  async bookSlot(
    applicationId: string,
    candidateId: string,
    slotStart: Date,
    notes?: string
  ): Promise<{
    success: boolean;
    callId?: string;
    meetLink?: string;
    error?: string;
  }> {
    // 1. Check eligibility again (race condition protection)
    const eligibility = await this.checkEligibility(applicationId);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    const application = eligibility.application!;

    // 2. Get recruiter info
    const subscription = await recruiterSubscriptionRepo.findByJob(
      application.jobId
    );
    const recruiterId = subscription[0]?.recruiterId;
    const recruiterUser = await userRepo.findById(recruiterId);

    // 3. Create calendar event
    const slotEnd = new Date(slotStart.getTime() + 10 * 60 * 1000); // 10 minutes

    const calendarResult = await googleCalendarService.createEvent(
      recruiterUser.googleAccessToken!,
      {
        title: `Interview Follow-up: ${application.candidateEmail}`,
        description: `Candidate self-scheduled follow-up call\n\nJob: ${application.jobTitle}\nCandidate: ${application.candidateEmail}\n${notes ? `\nNotes: ${notes}` : ''}`,
        startTime: slotStart,
        endTime: slotEnd,
        attendees: [application.candidateEmail],
      },
      recruiterUser.googleRefreshToken
    );

    if (!calendarResult.success) {
      return {
        success: false,
        error: 'Failed to create calendar event',
      };
    }

    // 4. Create scheduled call record
    const scheduledCall = await scheduledCallRepo.createScheduledCall({
      applicationId,
      recruiterId,
      candidateEmail: application.candidateEmail,
      jobId: application.jobId,
      scheduledAt: slotStart,
      duration: 10,
      notes,
      googleCalendarEventId: calendarResult.data?.eventId,
      meetLink: calendarResult.data?.meetLink,
      bookedBy: 'candidate', // NEW FIELD
      candidateId, // NEW FIELD
      cancellationDeadline: new Date(slotStart.getTime() - 24 * 60 * 60 * 1000), // 24h before
    });

    // 5. Update application
    await applicationRepo.update(applicationId, {
      'candidateScheduling.hasBooked': true,
      'candidateScheduling.lastBooking': {
        callId: scheduledCall._id.toString(),
        bookedAt: new Date(),
        scheduledAt: slotStart,
      },
    });

    // 6. Add timeline event
    await timelineService.addEvent(applicationId, {
      status: 'interview_scheduled',
      actorType: 'candidate',
      actorId: candidateId,
      note: `Candidate scheduled follow-up call for ${slotStart.toLocaleString()}`,
    });

    // 7. Send notifications
    await recruiterNotificationService.notifyCallScheduled({
      recruiterEmail: recruiterUser.email,
      candidateEmail: application.candidateEmail,
      jobTitle: application.jobTitle,
      scheduledAt: slotStart,
      meetLink: calendarResult.data?.meetLink,
    });

    return {
      success: true,
      callId: scheduledCall._id.toString(),
      meetLink: calendarResult.data?.meetLink,
    };
  }

  /**
   * Cancel a booking (candidate-initiated)
   */
  async cancelBooking(
    callId: string,
    candidateId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Get scheduled call
    const call = await scheduledCallRepo.findScheduledCallById(callId);
    if (!call) {
      return { success: false, error: 'Booking not found' };
    }

    // 2. Verify candidate owns this booking
    if (call.candidateId !== candidateId) {
      return { success: false, error: 'Not authorized' };
    }

    // 3. Check cancellation deadline
    const now = new Date();
    if (now > call.cancellationDeadline) {
      return {
        success: false,
        error: 'Cannot cancel within 24 hours of scheduled time',
      };
    }

    // 4. Update call status
    await scheduledCallRepo.updateCallStatus(
      callId,
      'cancelled',
      `Cancelled by candidate: ${reason || 'No reason provided'}`
    );

    // 5. Update application
    await applicationRepo.update(call.applicationId.toString(), {
      'candidateScheduling.hasBooked': false,
      'candidateScheduling.lastBooking': null,
    });

    // 6. Add timeline event
    await timelineService.addEvent(call.applicationId.toString(), {
      status: 'under_review',
      actorType: 'candidate',
      actorId: candidateId,
      note: `Candidate cancelled scheduled call: ${reason || 'No reason provided'}`,
    });

    return { success: true };
  }

  /**
   * Generate available slots from free/busy data
   */
  private generateAvailableSlots(
    freeBusySlots: FreeBusySlot[],
    existingCalls: ScheduledCall[],
    availability: RecruiterAvailability | null,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = 10; // minutes
    const buffer = availability?.bufferMinutes || 5;

    // TODO: Implement slot generation logic
    // 1. Iterate through each day from startDate to endDate
    // 2. For each day, get working hours from availability
    // 3. Split working hours into 10-minute slots
    // 4. Filter out slots that overlap with busy times
    // 5. Filter out slots that overlap with existing calls + buffer
    // 6. Return available slots

    return slots;
  }
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}
```

---

### Step 2: tRPC Procedures

**File**: `/src/services/trpc/candidateRouter.ts`

```typescript
// Add to existing candidateRouter

export const candidateRouter = t.router({
  // ... existing procedures

  /**
   * Check if candidate can schedule a call
   */
  checkSchedulingEligibility: t.procedure
    .use(isAuthed)
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const schedulingService = new CandidateSchedulingService();
      return schedulingService.checkEligibility(input.applicationId);
    }),

  /**
   * Get available time slots
   */
  getAvailableSlots: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        applicationId: z.string(),
        days: z.number().default(14).max(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const schedulingService = new CandidateSchedulingService();
      return schedulingService.getAvailableSlots(
        input.applicationId,
        input.days
      );
    }),

  /**
   * Book a time slot
   */
  bookTimeSlot: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        applicationId: z.string(),
        slotStart: z.string().datetime(), // ISO string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      const schedulingService = new CandidateSchedulingService();
      return schedulingService.bookSlot(
        input.applicationId,
        userId,
        new Date(input.slotStart),
        input.notes
      );
    }),

  /**
   * Cancel a booking
   */
  cancelBooking: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        callId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      const schedulingService = new CandidateSchedulingService();
      return schedulingService.cancelBooking(
        input.callId,
        userId,
        input.reason
      );
    }),

  /**
   * Reschedule a booking
   */
  rescheduleBooking: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        callId: z.string(),
        newSlotStart: z.string().datetime(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      const schedulingService = new CandidateSchedulingService();

      // Cancel existing
      const cancelResult = await schedulingService.cancelBooking(
        input.callId,
        userId,
        input.reason
      );

      if (!cancelResult.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: cancelResult.error || 'Failed to cancel existing booking',
        });
      }

      // Get call details for application ID
      const call = await scheduledCallRepo.findScheduledCallById(input.callId);

      // Book new slot
      const bookResult = await schedulingService.bookSlot(
        call!.applicationId.toString(),
        userId,
        new Date(input.newSlotStart),
        `Rescheduled from previous booking: ${input.reason || 'No reason provided'}`
      );

      if (!bookResult.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: bookResult.error || 'Failed to book new slot',
        });
      }

      // Mark as rescheduled
      await scheduledCallRepo.update(bookResult.callId!, {
        rescheduledFrom: input.callId,
      });

      return bookResult;
    }),
});
```

---

## 🎨 Frontend Implementation

### Step 1: Eligibility Check Component

**File**: `/src/components/candidate/scheduling/SchedulingEligibility.tsx`

```tsx
'use client';

import { trpc } from '@/services/trpc/client';
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react';

interface SchedulingEligibilityProps {
  applicationId: string;
  onEligible: () => void;
}

export function SchedulingEligibility({
  applicationId,
  onEligible,
}: SchedulingEligibilityProps) {
  const { data, isLoading } =
    trpc.candidate.checkSchedulingEligibility.useQuery({ applicationId });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!data?.eligible) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">
              Scheduling Not Available
            </h3>
            <p className="text-sm text-amber-700 mt-1">{data?.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-200 bg-green-50 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-900">
            You're Eligible to Schedule!
          </h3>
          <p className="text-sm text-green-700 mt-1">
            Great job completing your AI interview! You can now schedule a
            10-minute follow-up call with your recruiter.
          </p>
          <button
            onClick={onEligible}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            View Available Times
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 2: Available Slots Component

**File**: `/src/components/candidate/scheduling/AvailableSlots.tsx`

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/services/trpc/client';
import { Calendar, Clock } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';

interface AvailableSlotsProps {
  applicationId: string;
  onSlotSelected: (slot: Date) => void;
}

export function AvailableSlots({
  applicationId,
  onSlotSelected,
}: AvailableSlotsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, isLoading } = trpc.candidate.getAvailableSlots.useQuery({
    applicationId,
    days: 14,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.slots || data.slots.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          No available slots found in the next 14 days.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Please check back later or contact your recruiter directly.
        </p>
      </div>
    );
  }

  // Group slots by date
  const slotsByDate = data.slots.reduce(
    (acc, slot) => {
      const dateKey = format(slot.start, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    },
    {} as Record<string, typeof data.slots>
  );

  const dates = Object.keys(slotsByDate).sort();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">
          Schedule with {data.recruiterName}
        </h3>
        <p className="text-sm text-gray-600">
          Select a date, then choose a 10-minute time slot
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Times shown in {data.timezone}
        </p>
      </div>

      {/* Date Selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Available Dates
        </h4>
        <div className="grid grid-cols-7 gap-2">
          {dates.map(dateKey => {
            const date = parseISO(dateKey);
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(date)}
                className={`p-3 border rounded-lg text-center transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {format(date, 'EEE')}
                </div>
                <div className="text-lg font-semibold">{format(date, 'd')}</div>
                <div className="text-xs text-gray-500">
                  {format(date, 'MMM')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Available Times on {format(selectedDate, 'MMMM d, yyyy')}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slotsByDate[format(selectedDate, 'yyyy-MM-dd')].map(slot => (
              <button
                key={slot.start.toString()}
                onClick={() => onSlotSelected(slot.start)}
                className="p-3 border border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors text-center"
              >
                <Clock className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-medium">
                  {format(slot.start, 'h:mm a')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 3: Booking Confirmation Modal

**File**: `/src/components/candidate/scheduling/BookingConfirmation.tsx`

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/services/trpc/client';
import { format } from 'date-fns';
import { Calendar, Clock, Video, X } from 'lucide-react';

interface BookingConfirmationProps {
  applicationId: string;
  selectedSlot: Date;
  recruiterName: string;
  onClose: () => void;
  onSuccess: (meetLink: string) => void;
}

export function BookingConfirmation({
  applicationId,
  selectedSlot,
  recruiterName,
  onClose,
  onSuccess,
}: BookingConfirmationProps) {
  const [notes, setNotes] = useState('');

  const bookSlotMutation = trpc.candidate.bookTimeSlot.useMutation({
    onSuccess: data => {
      if (data.success && data.meetLink) {
        onSuccess(data.meetLink);
      }
    },
  });

  const handleConfirm = () => {
    bookSlotMutation.mutate({
      applicationId,
      slotStart: selectedSlot.toISOString(),
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Booking
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
                <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <div className="font-medium text-indigo-900">
                    {format(selectedSlot, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-indigo-700 mt-1">
                    {format(selectedSlot, 'h:mm a')} -{' '}
                    {format(
                      new Date(selectedSlot.getTime() + 10 * 60 * 1000),
                      'h:mm a'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">10 minutes</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Follow-up call with {recruiterName}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Any specific topics you'd like to discuss?"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Cancellation Policy:</strong> You can cancel or
                  reschedule up to 24 hours before the scheduled time.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              onClick={handleConfirm}
              disabled={bookSlotMutation.isLoading}
              className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 sm:ml-3 sm:w-auto"
            >
              {bookSlotMutation.isLoading ? (
                'Booking...'
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={bookSlotMutation.isLoading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>

          {bookSlotMutation.error && (
            <div className="px-4 pb-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">
                  {bookSlotMutation.error.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 4: Success Screen

**File**: `/src/components/candidate/scheduling/BookingSuccess.tsx`

```tsx
'use client';

import { CheckCircle, Video, Calendar, Mail } from 'lucide-react';

interface BookingSuccessProps {
  meetLink: string;
  scheduledAt: Date;
  recruiterName: string;
}

export function BookingSuccess({
  meetLink,
  scheduledAt,
  recruiterName,
}: BookingSuccessProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600">
          Your follow-up call with {recruiterName} has been scheduled
        </p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">When</h3>
          </div>
          <p className="text-lg">{format(scheduledAt, 'EEEE, MMMM d, yyyy')}</p>
          <p className="text-gray-600">
            {format(scheduledAt, 'h:mm a')} -{' '}
            {format(new Date(scheduledAt.getTime() + 10 * 60 * 1000), 'h:mm a')}
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Video className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Join Link</h3>
          </div>
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {meetLink}
          </a>
          <p className="text-sm text-gray-600 mt-2">
            A calendar invite with this link has been sent to your email
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-amber-50">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">What's Next?</h3>
          </div>
          <ul className="text-sm text-amber-800 space-y-2 ml-8 list-disc">
            <li>Check your email for the calendar invitation</li>
            <li>Add the event to your calendar</li>
            <li>You'll receive a reminder 1 hour before the call</li>
            <li>You can cancel or reschedule up to 24 hours in advance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Implementation Checklist

### Phase 1: Backend (Day 1)

- [ ] Create `CandidateSchedulingService` class
- [ ] Add eligibility check method
- [ ] Add get available slots method
- [ ] Add book slot method
- [ ] Add cancel/reschedule methods
- [ ] Create `recruiterAvailability` collection schema
- [ ] Add candidate scheduling fields to Application schema
- [ ] Add bookedBy/candidateId fields to ScheduledCall schema

### Phase 2: API & tRPC (Day 1-2)

- [ ] Add tRPC procedures to candidate router
- [ ] Test eligibility check endpoint
- [ ] Test get available slots endpoint
- [ ] Test book slot endpoint
- [ ] Test cancel/reschedule endpoints

### Phase 3: Frontend (Day 2)

- [ ] Create `SchedulingEligibility` component
- [ ] Create `AvailableSlots` component
- [ ] Create `BookingConfirmation` modal
- [ ] Create `BookingSuccess` screen
- [ ] Add candidate scheduling to application detail page

### Phase 4: Testing (Day 3)

- [ ] Test eligibility scenarios (no interview, already booked)
- [ ] Test slot availability calculation
- [ ] Test booking flow end-to-end
- [ ] Test cancellation within/outside deadline
- [ ] Test rescheduling flow
- [ ] Verify Google Calendar events created
- [ ] Verify email notifications sent
- [ ] Test timezone handling
- [ ] Test mobile responsive design

---

## 🎓 User Flow

1. **Candidate completes AI interview** → Application marked as eligible
2. **Candidate views application details** → Sees "Schedule Follow-up Call" section
3. **Click "View Available Times"** → Shows eligibility confirmation
4. **View calendar grid** → Shows next 14 days with available dates
5. **Select date** → Shows available 10-minute time slots for that day
6. **Select time slot** → Opens confirmation modal
7. **Add notes (optional)** → Explain what topics to discuss
8. **Confirm booking** → Creates calendar event + sends notifications
9. **Success screen** → Shows Meet link + calendar details
10. **Email confirmation** → Both candidate and recruiter receive calendar invite

---

## 📝 Testing Scenarios

### Happy Path

1. Candidate completes AI interview
2. Booking button appears
3. Available slots displayed
4. Booking succeeds
5. Calendar event created
6. Emails sent

### Edge Cases

1. **No interview completed** → Show "Complete interview first" message
2. **Already booked** → Show existing booking details + reschedule option
3. **No available slots** → Show "No availability" message + contact recruiter
4. **Booking race condition** → Second booking fails with clear error
5. **Calendar API failure** → Graceful fallback + retry option
6. **Cancel within 24h** → Block cancellation + show policy
7. **Reschedule within 24h** → Block rescheduling + show policy

---

## 🚀 Future Enhancements

1. **Reminder Emails** - Send automatic reminders 24h and 1h before call
2. **Buffer Time** - Prevent back-to-back bookings with configurable buffer
3. **Business Hours** - Respect recruiter's working hours preferences
4. **Multi-Recruiter** - Allow booking with any recruiter on the job
5. **Video Analytics** - Track booking conversion rates
6. **Smart Scheduling** - Suggest best times based on both calendars
7. **No-Show Tracking** - Flag candidates who miss scheduled calls
8. **Booking Limits** - Max bookings per day/week per recruiter

---

**Ready to implement!** Start with Phase 1 (Backend) and work through sequentially.
