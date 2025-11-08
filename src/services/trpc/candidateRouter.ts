import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { getMongoClient } from '../../data-access/mongoClient';
import { resumeVectorRepo } from '../../data-access/repositories/resumeVectorRepo';
import { logger } from '../../monitoring/logger';

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
});
