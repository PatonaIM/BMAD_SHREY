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
});
