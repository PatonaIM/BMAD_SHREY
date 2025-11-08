import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { getMongoClient } from '../../data-access/mongoClient';
import { resumeVectorRepo } from '../../data-access/repositories/resumeVectorRepo';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import { recruiterSubscriptionRepo } from '../../data-access/repositories/recruiterSubscriptionRepo';
import { candidateSchedulingService } from '../../services/candidateSchedulingService';
import { logger } from '../../monitoring/logger';
import { getGoogleCalendarTokens } from '../../data-access/repositories/userRepo';

const t = initTRPC.context<Context>().create();

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx });
});

const GetRecommendedJobsSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  minMatchScore: z.number().min(0).max(100).optional(),
  includeApplied: z.boolean().default(false), // Include jobs already applied to
});

export const candidateRouter = t.router({
  /**
   * Get AI-powered job recommendations for any authenticated user
   * Uses vector similarity search on job embeddings vs user's resume
   */
  getRecommendedJobs: t.procedure
    .use(isAuthed)
    .input(GetRecommendedJobsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found in session',
        });
      }

      try {
        // Get candidate's resume vector
        const resumeVectors = await resumeVectorRepo.getByUserId(userId);

        if (!resumeVectors || resumeVectors.length === 0) {
          logger.info({
            msg: 'Candidate has no resume vector',
            userId,
          });
          return {
            recommendations: [],
            count: 0,
            message:
              'No resume found. Please upload your resume to get personalized job recommendations.',
          };
        }

        // Use the most recent resume vector
        const candidateVector = resumeVectors.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];

        if (
          !candidateVector ||
          !candidateVector.embeddings ||
          candidateVector.embeddings.length === 0
        ) {
          logger.warn({
            msg: 'Candidate resume vector has no embedding',
            userId,
            profileId: candidateVector?._id,
          });
          return {
            recommendations: [],
            count: 0,
            message:
              'Your resume is being processed. Please check back in a few minutes.',
          };
        }

        const client = await getMongoClient();
        const db = client.db();
        const jobVectors = db.collection('jobVectors');

        // Build pipeline for vector search
        const pipeline: Record<string, unknown>[] = [
          {
            $vectorSearch: {
              index: 'job_vector_index',
              path: 'embedding',
              queryVector: candidateVector.embeddings,
              numCandidates: 100, // Number of candidates to consider
              limit: input.limit * 3, // Get more for filtering
            },
          },
          {
            $addFields: {
              vectorScore: { $meta: 'vectorSearchScore' },
            },
          },
          // Lookup job details
          {
            $lookup: {
              from: 'jobs',
              localField: 'jobId',
              foreignField: '_id',
              as: 'job',
            },
          },
          {
            $unwind: '$job',
          },
          // Filter for active jobs only
          {
            $match: {
              'job.status': 'active',
            },
          },
        ];

        // Exclude jobs already applied to (unless explicitly requested)
        if (!input.includeApplied) {
          pipeline.push({
            $lookup: {
              from: 'applications',
              let: { jobId: '$job._id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$jobId', '$$jobId'] },
                        { $eq: ['$candidateId', userId] }, // userId is already a string
                      ],
                    },
                  },
                },
              ],
              as: 'application',
            },
          });
          pipeline.push({
            $match: {
              application: { $eq: [] }, // No existing application
            },
          });
        }

        // Project final fields
        pipeline.push({
          $project: {
            _id: '$job._id',
            title: '$job.title',
            company: '$job.company',
            location: '$job.location',
            employmentType: '$job.employmentType',
            description: '$job.description',
            requirements: '$job.requirements',
            skills: '$job.skills',
            salary: '$job.salary',
            postedAt: '$job.postedAt',
            matchScore: {
              $multiply: ['$vectorScore', 100], // Convert to percentage
            },
            matchBreakdown: {
              vectorSimilarity: {
                $multiply: ['$vectorScore', 100],
              },
            },
          },
        });

        // Apply minimum match score filter if specified
        if (input.minMatchScore !== undefined) {
          pipeline.push({
            $match: {
              matchScore: { $gte: input.minMatchScore },
            },
          });
        }

        // Sort by match score descending
        pipeline.push({
          $sort: { matchScore: -1 },
        });

        // Limit results
        pipeline.push({
          $limit: input.limit,
        });

        const results = await jobVectors.aggregate(pipeline).toArray();

        logger.info({
          msg: 'Job recommendations generated',
          userId,
          count: results.length,
          hasResumeVector: true,
        });

        return {
          recommendations: results.map(r => ({
            ...r,
            matchScore: Math.round(r.matchScore * 10) / 10, // Round to 1 decimal
            matchBreakdown: {
              vectorSimilarity:
                Math.round(r.matchBreakdown.vectorSimilarity * 10) / 10,
            },
          })),
          count: results.length,
        };
      } catch (error) {
        logger.error({
          msg: 'Failed to get job recommendations',
          userId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get job recommendations: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Get recruiter's Calendar tokens for scheduling
   * Returns tokens for the recruiter assigned to the application's job
   */
  getRecruiterCalendarTokens: t.procedure
    .use(isAuthed)
    .input(z.object({ applicationId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        // Get application to find the job
        const application = await applicationRepo.findById(input.applicationId);
        if (!application) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Application not found',
          });
        }

        // Find subscribed recruiter for this job
        const subscriptions =
          await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
            application.jobId
          );

        if (subscriptions.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No recruiter assigned to this job',
          });
        }

        const recruiterId = subscriptions[0]?.recruiterId;
        if (!recruiterId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          });
        }

        // TODO: In production, retrieve recruiter's stored OAuth tokens from database
        // For now, this endpoint documents the expected return shape
        // The recruiter's tokens should be stored when they authenticate with Google

        // Return placeholder - in production this would fetch from recruiterMetadata or similar
        return {
          hasTokens: false,
          message:
            'Recruiter Calendar tokens not available. Recruiter must authenticate with Google Calendar.',
          recruiterId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error({
          msg: 'Failed to get recruiter calendar tokens',
          applicationId: input.applicationId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recruiter calendar tokens',
        });
      }
    }),

  /**
   * Check if candidate is eligible to book a follow-up call
   */
  checkSchedulingEligibility: t.procedure
    .use(isAuthed)
    .input(z.object({ applicationId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const eligibility = await candidateSchedulingService.checkEligibility(
          input.applicationId
        );
        return eligibility;
      } catch (error) {
        logger.error({
          msg: 'Failed to check scheduling eligibility',
          applicationId: input.applicationId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check eligibility',
        });
      }
    }),

  /**
   * Get available time slots for booking
   * Fetches recruiter's Calendar tokens from database
   */
  getAvailableSlots: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        applicationId: z.string().min(1),
        days: z.number().min(1).max(30).default(14),
      })
    )
    .query(async ({ input }) => {
      try {
        // Get application to find recruiter
        const application = await applicationRepo.findById(input.applicationId);
        if (!application) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Application not found',
          });
        }

        // Find subscribed recruiter for this job
        const subscriptions =
          await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
            application.jobId
          );

        if (subscriptions.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No recruiter assigned to this job',
          });
        }

        const recruiterId = subscriptions[0]?.recruiterId;
        if (!recruiterId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          });
        }

        // Get recruiter's Calendar tokens from database
        const tokens = await getGoogleCalendarTokens(recruiterId);
        if (!tokens) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Recruiter has not connected their Google Calendar yet. Please contact the recruiter.',
          });
        }

        const slots = await candidateSchedulingService.getAvailableSlots(
          input.applicationId,
          tokens.accessToken,
          tokens.refreshToken,
          input.days
        );

        if (!slots) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No available slots found',
          });
        }

        return slots;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error({
          msg: 'Failed to get available slots',
          applicationId: input.applicationId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get available slots',
        });
      }
    }),

  /**
   * Book a time slot for follow-up call
   * Fetches recruiter's Calendar tokens from database
   */
  bookTimeSlot: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        applicationId: z.string().min(1),
        slotStart: z.string().datetime(),
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
        // Get application to find recruiter
        const application = await applicationRepo.findById(input.applicationId);
        if (!application) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Application not found',
          });
        }

        // Find subscribed recruiter for this job
        const subscriptions =
          await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
            application.jobId
          );

        if (subscriptions.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No recruiter assigned to this job',
          });
        }

        const recruiterId = subscriptions[0]?.recruiterId;
        if (!recruiterId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          });
        }

        // Get recruiter's Calendar tokens from database
        const tokens = await getGoogleCalendarTokens(recruiterId);
        if (!tokens) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Recruiter has not connected their Google Calendar yet. Please contact the recruiter.',
          });
        }

        const result = await candidateSchedulingService.bookSlot(
          input.applicationId,
          userId,
          new Date(input.slotStart),
          tokens.accessToken,
          tokens.refreshToken,
          input.notes
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to book slot',
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error({
          msg: 'Failed to book time slot',
          applicationId: input.applicationId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to book time slot',
        });
      }
    }),

  /**
   * Cancel a booked call (candidate-initiated)
   */
  cancelBooking: t.procedure
    .use(isAuthed)
    .input(
      z.object({
        callId: z.string().min(1),
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

      try {
        const result = await candidateSchedulingService.cancelBooking(
          input.callId,
          userId,
          input.reason
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to cancel booking',
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error({
          msg: 'Failed to cancel booking',
          callId: input.callId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel booking',
        });
      }
    }),
});
