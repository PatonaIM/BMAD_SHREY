import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { recruiterSubscriptionRepo } from '../../data-access/repositories/recruiterSubscriptionRepo';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import { candidateMatchingRepo } from '../../data-access/repositories/candidateMatchingRepo';
import { candidateInvitationsRepo } from '../../data-access/repositories/candidateInvitationsRepo';
import { ApplicationRepository } from '../../data-access/repositories/applicationRepo';
import { getMongoClient } from '../../data-access/mongoClient';
import { ObjectId } from 'mongodb';
import { TimelineService } from '../../services/timelineService';
import { googleCalendarService } from '../../services/googleCalendarService';
import { scheduledCallRepo } from '../../data-access/repositories/scheduledCallRepo';
import {
  getGoogleCalendarTokens,
  removeGoogleCalendarTokens,
} from '../../data-access/repositories/userRepo';

const t = initTRPC.context<Context>().create();

// Initialize repositories
const applicationRepo = new ApplicationRepository();

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx });
});

// Middleware to check if user has recruiter role
const isRecruiter = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  const roles = (ctx.session.user as { roles?: string[] })?.roles || [];
  if (!roles.includes('RECRUITER') && !roles.includes('ADMIN')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions. Recruiter role required.',
    });
  }
  return next({ ctx });
});

const JobSubscribeSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  notificationsEnabled: z.boolean().optional().default(true),
});

const JobUnsubscribeSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

const JobsQuerySchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  employmentType: z
    .enum(['full-time', 'part-time', 'contract', 'temporary', 'internship'])
    .optional(),
  sortBy: z
    .enum(['newest', 'applications', 'alphabetical'])
    .optional()
    .default('newest'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const JobIdSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

const SuggestedCandidatesQuerySchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  minMatchScore: z.number().min(0).max(100).optional(),
  requiredSkills: z.array(z.string()).optional(),
  minYearsExperience: z.number().min(0).optional(),
  maxYearsExperience: z.number().min(0).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
});

const InviteCandidateSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

const DismissSuggestionSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
});

const GetApplicationsSchema = z.object({
  jobId: z.string().optional(),
  status: z
    .enum([
      'submitted',
      'under_review',
      'interview_scheduled',
      'offer',
      'rejected',
      'withdrawn',
    ])
    .optional(),
  minScore: z.number().min(0).max(100).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const recruiterRouter = t.router({
  /**
   * Subscribe to a job
   */
  subscribe: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobSubscribeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const subscription = await recruiterSubscriptionRepo.createSubscription(
          {
            jobId: input.jobId,
            recruiterId: userId,
            notificationsEnabled: input.notificationsEnabled,
          }
        );

        return {
          success: true,
          subscriptionId: subscription._id.toString(),
          message: 'Successfully subscribed to job',
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to subscribe: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Unsubscribe from a job
   */
  unsubscribe: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobUnsubscribeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const success = await recruiterSubscriptionRepo.deleteSubscription(
          input.jobId,
          userId
        );

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Subscription not found',
          });
        }

        return {
          success: true,
          message: 'Successfully unsubscribed from job',
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to unsubscribe: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get active jobs (jobs the current recruiter is subscribed to)
   */
  getActiveJobs: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobsQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        // Get active subscriptions with job data
        const subscriptions =
          await recruiterSubscriptionRepo.findActiveSubscriptionsByRecruiter(
            userId
          );

        // Apply filters
        let filtered = subscriptions;

        if (input.keyword) {
          const keyword = input.keyword.toLowerCase();
          filtered = filtered.filter(
            sub =>
              sub.jobTitle?.toLowerCase().includes(keyword) ||
              sub.companyName?.toLowerCase().includes(keyword) ||
              sub.location?.toLowerCase().includes(keyword)
          );
        }

        if (input.location) {
          filtered = filtered.filter(sub =>
            sub.location?.toLowerCase().includes(input.location!.toLowerCase())
          );
        }

        // Sort
        if (input.sortBy === 'newest') {
          filtered.sort(
            (a, b) =>
              (b.postedAt?.getTime() || 0) - (a.postedAt?.getTime() || 0)
          );
        } else if (input.sortBy === 'applications') {
          filtered.sort(
            (a, b) => (b.applicationCount || 0) - (a.applicationCount || 0)
          );
        } else if (input.sortBy === 'alphabetical') {
          filtered.sort((a, b) =>
            (a.jobTitle || '').localeCompare(b.jobTitle || '')
          );
        }

        // Pagination
        const total = filtered.length;
        const start = (input.page - 1) * input.limit;
        const paginated = filtered.slice(start, start + input.limit);

        return {
          jobs: paginated,
          total,
          page: input.page,
          limit: input.limit,
          hasMore: start + input.limit < total,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch active jobs: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get all jobs with subscription indicators
   */
  getAllJobs: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobsQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        // Get all jobs using existing jobRepo
        const jobResults = await jobRepo.search({
          keyword: input.keyword,
          location: input.location,
          employmentType: input.employmentType,
          page: input.page,
          limit: input.limit,
        });

        // Get subscription status for each job
        const jobsWithSubscription = await Promise.all(
          jobResults.jobs.map(async job => {
            const isSubscribedByUser =
              await recruiterSubscriptionRepo.isSubscribed(
                job._id.toString(),
                userId
              );
            const subscriptionCount =
              await recruiterSubscriptionRepo.getSubscriptionCount(
                job._id.toString()
              );

            return {
              ...job,
              isSubscribed: isSubscribedByUser,
              recruiterCount: subscriptionCount,
            };
          })
        );

        return {
          jobs: jobsWithSubscription,
          total: jobResults.total,
          page: input.page,
          limit: input.limit,
          hasMore: input.page * input.limit < jobResults.total,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch all jobs: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get closed/archived jobs
   */
  getClosedJobs: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobsQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        // Get closed jobs (status='closed')
        const jobResults = await jobRepo.search({
          keyword: input.keyword,
          location: input.location,
          employmentType: input.employmentType,
          page: input.page,
          limit: input.limit,
          // TODO: Add status filter to jobRepo.search if not already available
        });

        // Filter for closed jobs only (temporary client-side filtering)
        const closedJobs = jobResults.jobs.filter(
          job => job.status === 'archived'
        );

        return {
          jobs: closedJobs,
          total: closedJobs.length,
          page: input.page,
          limit: input.limit,
          hasMore: false,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch closed jobs: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Check subscription status for a specific job
   */
  checkSubscription: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobIdSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const isSubscribed = await recruiterSubscriptionRepo.isSubscribed(
          input.jobId,
          userId
        );

        return {
          isSubscribed,
          jobId: input.jobId,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to check subscription: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get recruiters subscribed to a job (for admins or job details)
   */
  getJobSubscribers: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(JobIdSchema)
    .query(async ({ input }) => {
      try {
        const recruiterIds =
          await recruiterSubscriptionRepo.getSubscribedRecruiters(input.jobId);
        const count = recruiterIds.length;

        return {
          count,
          recruiterIds, // Already strings (UUIDs)
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get job subscribers: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get AI-powered suggested candidates for a specific job
   */
  getSuggestedCandidates: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(SuggestedCandidatesQuerySchema)
    .query(async ({ input }) => {
      try {
        const suggestions = await candidateMatchingRepo.findProactiveMatches(
          input.jobId,
          {
            minMatchScore: input.minMatchScore,
            requiredSkills: input.requiredSkills,
            minYearsExperience: input.minYearsExperience,
            maxYearsExperience: input.maxYearsExperience,
            location: input.location,
            isRemote: input.isRemote,
          },
          input.limit
        );

        return {
          suggestions,
          count: suggestions.length,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get suggested candidates: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get high-scoring candidates across all jobs
   */
  getHighScoringCandidates: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .query(async () => {
      try {
        const suggestions =
          await candidateMatchingRepo.findHighScoringCandidates(50);

        return {
          suggestions,
          count: suggestions.length,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get high-scoring candidates: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Invite a candidate to apply for a job
   */
  inviteCandidate: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(InviteCandidateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const invitation = await candidateInvitationsRepo.createInvitation({
          jobId: input.jobId,
          candidateId: input.candidateId,
          recruiterId: userId,
          message: input.message,
        });

        return {
          success: true,
          invitationId: invitation._id.toString(),
          message: 'Invitation sent successfully',
        };
      } catch (err) {
        // Handle duplicate invitation
        if ((err as Error).message.includes('already been invited')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Candidate has already been invited to this job',
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to invite candidate: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Dismiss a candidate suggestion (stores in user preferences - not implemented yet)
   */
  dismissSuggestion: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(DismissSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      // TODO: Store dismissal in user preferences or a separate collection
      // For now, just return success
      return {
        success: true,
        candidateId: input.candidateId,
        message: 'Suggestion dismissed',
      };
    }),

  /**
   * Get invitations sent by the current recruiter
   */
  getInvitations: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .query(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const invitations =
          await candidateInvitationsRepo.getInvitationsByRecruiter(userId);

        return {
          invitations,
          count: invitations.length,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get invitations: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get applications with filtering and pagination
   * Used for the Application Grid view
   */
  getApplications: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(GetApplicationsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const collection = await applicationRepo['getCollection']();
        const { page, limit, jobId, status, minScore } = input;
        const skip = (page - 1) * limit;

        // Get recruiter's subscribed jobs
        const client = await getMongoClient();
        const db = client.db();
        const subscriptionsCollection = db.collection<{
          _id: unknown;
          jobId: { toString: () => string };
          recruiterId: string;
          isActive: boolean;
        }>('recruiterSubscriptions');
        const subscriptions = await subscriptionsCollection
          .find({ recruiterId: userId, isActive: true })
          .toArray();

        const subscribedJobIds = subscriptions.map(sub => sub.jobId.toString());

        // Debug logging
        // eslint-disable-next-line no-console
        console.log('[DEBUG getApplications]', {
          userId,
          subscriptionsCount: subscriptions.length,
          subscribedJobIds,
          requestedJobId: jobId,
        });

        // If no subscriptions, return empty
        if (subscribedJobIds.length === 0) {
          return {
            applications: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          };
        }

        // Build filter
        const filter: Record<string, unknown> = {};

        // Filter by specific job or all subscribed jobs
        // Note: jobId in applications collection is stored as ObjectId
        if (jobId) {
          // Verify recruiter has access to this specific job
          if (!subscribedJobIds.includes(jobId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this job',
            });
          }
          filter.jobId = new ObjectId(jobId);
        } else {
          // Filter by all subscribed jobs (convert strings to ObjectIds)
          filter.jobId = { $in: subscribedJobIds.map(id => new ObjectId(id)) };
        }

        if (status) {
          filter.status = status;
        }
        if (minScore !== undefined) {
          filter.matchScore = { $gte: minScore };
        }

        // Get total count
        const total = await collection.countDocuments(filter);

        // Get applications
        const applications = await collection
          .find(filter)
          .sort({ appliedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        return {
          applications,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + applications.length < total,
          },
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get applications: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get timeline for an application (role-based filtering)
   */
  getTimeline: t.procedure
    .use(isAuthed)
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const timelineService = new TimelineService();
        const roles = (ctx.session.user as { roles?: string[] })?.roles || [];
        const userRole =
          roles.includes('RECRUITER') || roles.includes('ADMIN')
            ? 'RECRUITER'
            : 'CANDIDATE';

        const timeline = await timelineService.getTimelineForRole(
          input.applicationId,
          userRole
        );

        return { timeline };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get timeline: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Add an event to the application timeline
   */
  addTimelineEvent: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(
      z.object({
        applicationId: z.string(),
        status: z.enum([
          'submitted',
          'ai_interview',
          'under_review',
          'interview_scheduled',
          'offer',
          'rejected',
        ]),
        note: z.string().optional(),
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

      try {
        const timelineService = new TimelineService();
        await timelineService.addEvent(input.applicationId, {
          status: input.status,
          actorType: 'recruiter',
          actorId: userId,
          note: input.note,
        });

        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to add timeline event: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Add feedback to an application
   * Creates interviewFeedback record, adds timeline event, triggers notifications
   */
  addFeedback: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .input(
      z.object({
        applicationId: z.string().min(1, 'Application ID is required'),
        rating: z.number().min(1).max(5),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
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

      try {
        const client = await getMongoClient();
        const db = client.db();
        const feedbackCollection = db.collection('interviewFeedback');

        // Create feedback record
        const feedback = {
          applicationId: new ObjectId(input.applicationId),
          recruiterId: userId,
          rating: input.rating,
          notes: input.notes || '',
          tags: input.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await feedbackCollection.insertOne(feedback);

        // Add timeline event
        const timelineService = new TimelineService();
        await timelineService.addEvent(input.applicationId, {
          status: 'under_review',
          actorType: 'recruiter',
          actorId: userId,
          note: `Added feedback with ${input.rating}-star rating`,
        });

        // TODO: Trigger notifications (email/Google Chat)
        // This would be implemented in Sprint 4 with the notification service

        return {
          success: true,
          feedbackId: result.insertedId.toString(),
          message: 'Feedback submitted successfully',
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to add feedback: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Schedule a call with a candidate
   * Creates Google Calendar event and sends invitations
   * Fetches recruiter's Calendar tokens from database
   */
  scheduleCall: t.procedure
    .use(isRecruiter)
    .input(
      z.object({
        applicationId: z.string().min(1, 'Application ID is required'),
        scheduledAt: z.string().datetime(),
        duration: z.number().min(15).max(120).default(30), // minutes
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

      try {
        // Get recruiter's Calendar tokens from database
        const tokens = await getGoogleCalendarTokens(userId);
        if (!tokens) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Google Calendar not connected. Please connect your calendar first.',
          });
        }

        // Get application details
        const application = await applicationRepo.findById(input.applicationId);
        if (!application) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Application not found',
          });
        }

        // Get job details
        const job = await jobRepo.findById(application.jobId);
        if (!job) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found',
          });
        }

        // Create calendar event
        const scheduledAt = new Date(input.scheduledAt);
        const endTime = new Date(
          scheduledAt.getTime() + input.duration * 60 * 1000
        );

        const calendarResult = await googleCalendarService.createEvent(
          tokens.accessToken,
          {
            title: `Interview: ${job.title} - ${application.candidateEmail}`,
            description: `Interview for ${job.title} position\n\nCandidate: ${application.candidateEmail}\n${input.notes ? `\nNotes: ${input.notes}` : ''}`,
            startTime: scheduledAt,
            endTime,
            attendees: [application.candidateEmail],
          },
          tokens.refreshToken
        );

        if (!calendarResult.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create calendar event: ${calendarResult.error}`,
          });
        }

        // Create scheduled call record
        const scheduledCall = await scheduledCallRepo.createScheduledCall({
          applicationId: input.applicationId,
          recruiterId: userId,
          candidateEmail: application.candidateEmail,
          jobId: application.jobId,
          scheduledAt,
          duration: input.duration,
          notes: input.notes,
          googleCalendarEventId: calendarResult.data?.eventId,
          meetLink: calendarResult.data?.meetLink,
        });

        // Add timeline event
        const timelineService = new TimelineService();
        await timelineService.addEvent(input.applicationId, {
          status: 'interview_scheduled',
          actorType: 'recruiter',
          actorId: userId,
          note: `Scheduled interview for ${scheduledAt.toLocaleString()}`,
        });

        return {
          success: true,
          callId: scheduledCall._id.toString(),
          meetLink: calendarResult.data?.meetLink,
          message: 'Interview scheduled successfully',
        };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to schedule call: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get scheduled calls for the recruiter
   */
  getScheduledCalls: t.procedure
    .use(isRecruiter)
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        status: z
          .enum([
            'scheduled',
            'completed',
            'cancelled',
            'no_show',
            'rescheduled',
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const calls = await scheduledCallRepo.findScheduledCallsByRecruiter(
          userId,
          {
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            status: input.status,
          }
        );

        return {
          success: true,
          calls: calls.map(call => ({
            ...call,
            _id: call._id.toString(),
            applicationId: call.applicationId.toString(),
            jobId: call.jobId.toString(),
          })),
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch scheduled calls: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Update call status (complete, cancel, no-show)
   */
  updateCallStatus: t.procedure
    .use(isRecruiter)
    .input(
      z.object({
        callId: z.string().min(1, 'Call ID is required'),
        status: z.enum(['completed', 'cancelled', 'no_show', 'rescheduled']),
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

      try {
        // Verify call belongs to this recruiter
        const call = await scheduledCallRepo.findScheduledCallById(
          input.callId
        );
        if (!call) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Scheduled call not found',
          });
        }

        if (call.recruiterId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this call',
          });
        }

        // Update status
        const updated = await scheduledCallRepo.updateCallStatus(
          input.callId,
          input.status,
          input.notes
        );

        if (!updated) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update call status',
          });
        }

        // Add timeline event
        const timelineService = new TimelineService();
        await timelineService.addEvent(call.applicationId.toString(), {
          status: 'under_review',
          actorType: 'recruiter',
          actorId: userId,
          note: `Interview ${input.status}${input.notes ? `: ${input.notes}` : ''}`,
        });

        return {
          success: true,
          message: 'Call status updated successfully',
        };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update call status: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Get Google Calendar connection status
   */
  getCalendarStatus: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .query(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        const tokens = await getGoogleCalendarTokens(userId);

        if (!tokens) {
          return {
            connected: false,
          };
        }

        return {
          connected: true,
          connectedAt: tokens.connectedAt,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get calendar status: ${(err as Error).message}`,
        });
      }
    }),

  /**
   * Disconnect Google Calendar
   */
  disconnectCalendar: t.procedure
    .use(isAuthed)
    .use(isRecruiter)
    .mutation(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        await removeGoogleCalendarTokens(userId);

        return {
          success: true,
          message: 'Calendar disconnected successfully',
        };
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to disconnect calendar: ${(err as Error).message}`,
        });
      }
    }),
});
