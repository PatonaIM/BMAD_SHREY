/**
 * Candidate Scheduling Service
 * Enables candidates who completed AI interviews to book follow-up calls
 */

import { applicationRepo } from '../data-access/repositories/applicationRepo';
import { scheduledCallRepo } from '../data-access/repositories/scheduledCallRepo';
import { recruiterSubscriptionRepo } from '../data-access/repositories/recruiterSubscriptionRepo';
import { findUserById } from '../data-access/repositories/userRepo';
import { googleCalendarService } from './googleCalendarService';
import { googleChatService } from './googleChatService';
import { TimelineService } from './timelineService';
import { stageService } from './stageService';
import { logger } from '../monitoring/logger';
import type { AiInterviewData } from '../shared/types/applicationStage';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  hasExistingBooking?: boolean;
  existingBookingId?: string;
}

export interface AvailableSlotsResult {
  slots: TimeSlot[];
  recruiterName: string;
  recruiterEmail: string;
  timezone: string;
}

export interface BookingResult {
  success: boolean;
  callId?: string;
  meetLink?: string;
  error?: string;
}

/**
 * CandidateSchedulingService - Handles candidate self-scheduling
 */
export class CandidateSchedulingService {
  private readonly timelineService: TimelineService;

  constructor() {
    this.timelineService = new TimelineService();
  }

  /**
   * Check if candidate is eligible to book a call
   */
  async checkEligibility(applicationId: string): Promise<EligibilityResult> {
    try {
      // 1. Get application
      const application = await applicationRepo.findById(applicationId);

      if (!application) {
        return {
          eligible: false,
          reason: 'Application not found',
        };
      }

      // 2. Check AI interview completed
      // Check both new interviewStatus field and legacy fields
      const hasCompletedInterview =
        application.interviewStatus === 'completed' ||
        application.interviewScore !== undefined ||
        application.aiInterviewScore !== undefined;

      if (!hasCompletedInterview) {
        return {
          eligible: false,
          reason:
            'Please complete your AI interview first to schedule a follow-up call',
        };
      }

      // 3. Check if already has a scheduled call (not cancelled/completed)
      const existingBookings =
        await scheduledCallRepo.findScheduledCallsByApplication(applicationId);

      const activeBooking = existingBookings.find(
        call => call.status === 'scheduled'
      );

      if (activeBooking) {
        return {
          eligible: false,
          reason: 'You already have a scheduled call with the recruiter',
          hasExistingBooking: true,
          existingBookingId: activeBooking._id.toString(),
        };
      }

      return { eligible: true };
    } catch (error) {
      logger.error({
        event: 'candidate_scheduling_eligibility_error',
        applicationId,
        error: (error as Error).message,
      });

      return {
        eligible: false,
        reason: 'Failed to check eligibility. Please try again.',
      };
    }
  }

  /**
   * Get available time slots for candidate booking
   */
  async getAvailableSlots(
    applicationId: string,
    recruiterAccessToken: string,
    recruiterRefreshToken?: string,
    days: number = 14
  ): Promise<AvailableSlotsResult | null> {
    try {
      // 1. Get application to find job and recruiter
      const application = await applicationRepo.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // 2. Find subscribed recruiter for this job
      const subscriptions =
        await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
          application.jobId
        );

      if (subscriptions.length === 0) {
        throw new Error('No recruiter assigned to this job');
      }

      // Use first active subscription (in production, could allow choosing)
      const subscription = subscriptions[0];
      if (!subscription) {
        throw new Error('No active subscription found');
      }
      const recruiterId = subscription.recruiterId;

      // 3. Get recruiter user info
      const recruiterUser = await findUserById(recruiterId);
      if (!recruiterUser) {
        throw new Error('Recruiter not found');
      }

      // 4. Get recruiter's free/busy information from Google Calendar
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const freeBusyResult = await googleCalendarService.getFreeBusy(
        recruiterAccessToken,
        startDate,
        endDate,
        recruiterRefreshToken
      );

      if (!freeBusyResult.success || !freeBusyResult.data?.slots) {
        throw new Error('Failed to fetch recruiter availability');
      }

      // 5. Get existing scheduled calls
      const existingCalls =
        await scheduledCallRepo.findScheduledCallsByRecruiter(recruiterId, {
          startDate,
          endDate,
          status: 'scheduled',
        });

      // 6. Generate available 10-minute slots
      const availableSlots = this.generateAvailableSlots(
        freeBusyResult.data.slots,
        existingCalls,
        startDate,
        endDate
      );

      return {
        slots: availableSlots,
        recruiterName: recruiterUser.email,
        recruiterEmail: recruiterUser.email,
        timezone: 'UTC', // TODO: Get from recruiter settings
      };
    } catch (error) {
      logger.error({
        event: 'candidate_scheduling_get_slots_error',
        applicationId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Book a time slot
   */
  async bookSlot(
    applicationId: string,
    candidateId: string,
    slotStart: Date,
    recruiterAccessToken: string,
    recruiterRefreshToken?: string,
    notes?: string
  ): Promise<BookingResult> {
    try {
      // 1. Re-check eligibility (race condition protection)
      const eligibility = await this.checkEligibility(applicationId);
      if (!eligibility.eligible) {
        return {
          success: false,
          error: eligibility.reason || 'Not eligible to book',
        };
      }

      // 2. Get application details
      const application = await applicationRepo.findById(applicationId);
      if (!application) {
        return { success: false, error: 'Application not found' };
      }

      // 3. Get recruiter info
      const subscriptions =
        await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
          application.jobId
        );

      if (subscriptions.length === 0) {
        return { success: false, error: 'No recruiter assigned' };
      }

      const subscription = subscriptions[0];
      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }
      const recruiterId = subscription.recruiterId;

      // 4. Create calendar event (10 minutes duration)
      const slotEnd = new Date(slotStart.getTime() + 10 * 60 * 1000);

      const calendarResult = await googleCalendarService.createEvent(
        recruiterAccessToken,
        {
          title: `Follow-up Call: ${application.candidateEmail}`,
          description: `Candidate-scheduled follow-up call\n\nJob: ${application.jobTitle}\nCandidate: ${application.candidateEmail}\nInterview Score: ${application.interviewScore}\n${notes ? `\nCandidate Notes: ${notes}` : ''}`,
          startTime: slotStart,
          endTime: slotEnd,
          attendees: [application.candidateEmail],
        },
        recruiterRefreshToken
      );

      if (!calendarResult.success) {
        logger.error({
          event: 'candidate_scheduling_calendar_error',
          applicationId,
          error: calendarResult.error,
        });
        return {
          success: false,
          error: 'Failed to create calendar event. Please try again.',
        };
      }

      // 5. Create scheduled call record
      const scheduledCall = await scheduledCallRepo.createScheduledCall({
        applicationId,
        recruiterId,
        candidateEmail: application.candidateEmail,
        jobId: application.jobId,
        scheduledAt: slotStart,
        duration: 10,
        notes: notes || 'Candidate self-scheduled follow-up call',
        googleCalendarEventId: calendarResult.data?.eventId,
        meetLink: calendarResult.data?.meetLink,
      });

      // 5.5. Update AI interview stage with scheduling info
      const recruiter = await findUserById(recruiterId);
      const stages = await stageService.getStagesByApplicationId(applicationId);
      const aiInterviewStage = stages.find(s => s.type === 'ai_interview');

      if (aiInterviewStage) {
        const updatedData: Partial<AiInterviewData> = {
          schedulingInfo: {
            hasScheduledCall: true,
            scheduledCallId: scheduledCall._id.toString(),
            scheduledAt: slotStart,
            recruiterName: recruiter?.email.split('@')[0] || 'Recruiter',
            recruiterEmail: recruiter?.email,
            meetLink: calendarResult.data?.meetLink,
            duration: 10,
            status: 'scheduled',
          },
        };

        await stageService.addStageData(
          aiInterviewStage.id,
          updatedData,
          candidateId
        );
      }

      // 6. Add timeline event
      await this.timelineService.addEvent(applicationId, {
        status: 'interview_scheduled',
        actorType: 'candidate',
        actorId: candidateId,
        note: `Candidate scheduled follow-up call for ${slotStart.toLocaleString()}`,
      });

      // 7. Send Google Chat notification
      if (calendarResult.data?.meetLink) {
        const candidateUser = await findUserById(candidateId);
        const candidateName =
          candidateUser?.email || application.candidateEmail;

        await googleChatService.notifyCallBooked(
          application,
          candidateName,
          application.candidateEmail,
          slotStart,
          calendarResult.data.meetLink,
          notes
        );
      }

      logger.info({
        event: 'candidate_scheduling_booked',
        applicationId,
        candidateId,
        callId: scheduledCall._id.toString(),
        scheduledAt: slotStart,
      });

      return {
        success: true,
        callId: scheduledCall._id.toString(),
        meetLink: calendarResult.data?.meetLink,
      };
    } catch (error) {
      logger.error({
        event: 'candidate_scheduling_book_error',
        applicationId,
        candidateId,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: 'Failed to book call. Please try again.',
      };
    }
  }

  /**
   * Cancel a booking (candidate-initiated)
   */
  async cancelBooking(
    callId: string,
    candidateId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get scheduled call
      const call = await scheduledCallRepo.findScheduledCallById(callId);
      if (!call) {
        return { success: false, error: 'Booking not found' };
      }

      // 2. Check cancellation deadline (24 hours before)
      const now = new Date();
      const deadline = new Date(
        call.scheduledAt.getTime() - 24 * 60 * 60 * 1000
      );

      if (now > deadline) {
        return {
          success: false,
          error:
            'Cannot cancel within 24 hours of scheduled time. Please contact the recruiter directly.',
        };
      }

      // 3. Update call status
      await scheduledCallRepo.updateCallStatus(
        callId,
        'cancelled',
        `Cancelled by candidate: ${reason || 'No reason provided'}`
      );

      // 4. Add timeline event
      await this.timelineService.addEvent(call.applicationId.toString(), {
        status: 'under_review',
        actorType: 'candidate',
        actorId: candidateId,
        note: `Candidate cancelled scheduled call${reason ? `: ${reason}` : ''}`,
      });

      logger.info({
        event: 'candidate_scheduling_cancelled',
        callId,
        candidateId,
        reason,
      });

      return { success: true };
    } catch (error) {
      logger.error({
        event: 'candidate_scheduling_cancel_error',
        callId,
        candidateId,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: 'Failed to cancel booking. Please try again.',
      };
    }
  }

  /**
   * Generate available 10-minute slots from free/busy data
   */
  private generateAvailableSlots(
    freeBusySlots: Array<{ start: Date; end: Date; status: 'free' | 'busy' }>,
    existingCalls: Array<{ scheduledAt: Date; duration: number }>,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    const slotDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    // Business hours: 9 AM - 5 PM
    const businessHourStart = 9;
    const businessHourEnd = 17;

    // Current time + 1 hour minimum lead time
    const minBookingTime = new Date(Date.now() + 60 * 60 * 1000);

    // Iterate through each day
    const currentDay = new Date(startDate);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay < endDate) {
      // Skip weekends
      const dayOfWeek = currentDay.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      // Generate slots for this day (9 AM - 5 PM)
      for (let hour = businessHourStart; hour < businessHourEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
          const slotStart = new Date(currentDay);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + slotDuration);

          // Skip if slot is in the past or within minimum lead time
          if (slotStart < minBookingTime) {
            continue;
          }

          // Check if slot overlaps with busy times
          const isOverlappingBusy = freeBusySlots.some(busy => {
            if (busy.status !== 'busy') return false;
            return (
              (slotStart >= busy.start && slotStart < busy.end) ||
              (slotEnd > busy.start && slotEnd <= busy.end) ||
              (slotStart <= busy.start && slotEnd >= busy.end)
            );
          });

          if (isOverlappingBusy) {
            continue;
          }

          // Check if slot overlaps with existing calls (including buffer)
          const isOverlappingCall = existingCalls.some(call => {
            const callStart = new Date(call.scheduledAt);
            const callEnd = new Date(
              callStart.getTime() + call.duration * 60 * 1000
            );
            const callStartWithBuffer = new Date(
              callStart.getTime() - bufferTime
            );
            const callEndWithBuffer = new Date(callEnd.getTime() + bufferTime);

            return (
              (slotStart >= callStartWithBuffer &&
                slotStart < callEndWithBuffer) ||
              (slotEnd > callStartWithBuffer && slotEnd <= callEndWithBuffer) ||
              (slotStart <= callStartWithBuffer && slotEnd >= callEndWithBuffer)
            );
          });

          if (isOverlappingCall) {
            continue;
          }

          // This slot is available!
          availableSlots.push({
            start: slotStart,
            end: slotEnd,
            available: true,
          });
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return availableSlots;
  }
}

// Export singleton instance
export const candidateSchedulingService = new CandidateSchedulingService();
