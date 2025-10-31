import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { jobCandidateMatchingService } from '../../../../services/ai/jobCandidateMatching';
import { matchScoreCache } from '../../../../services/ai/matchScoreCache';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { resumeVectorRepo } from '../../../../data-access/repositories/resumeVectorRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { logger } from '../../../../monitoring/logger';
import {
  extractedProfileToCandidateProfile,
  isProfileReadyForMatching,
} from '../../../../components/matching/profileTransformer';
import type {
  CandidateProfile,
  MatchingOptions,
} from '../../../../shared/types/matching';
import type { Job } from '../../../../shared/types/job';

interface SessionUser {
  id?: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

/**
 * POST /api/jobs/batch-score
 *
 * Calculates match scores for multiple jobs for the authenticated user.
 * Uses caching to avoid expensive recalculations.
 *
 * Request Body:
 * {
 *   jobIds: string[];
 *   options?: MatchingOptions;
 * }
 *
 * Response:
 * {
 *   success: true;
 *   hasProfile: boolean;
 *   matches: Array<{
 *     jobId: string;
 *     score: MatchScore;
 *     cached: boolean;
 *   }>;
 *   stats: {
 *     total: number;
 *     cached: number;
 *     calculated: number;
 *     processingTime: number;
 *   };
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id;

    // Parse request body
    const body = await req.json();
    const { jobIds, options = {} } = body;

    // Validate input
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (jobIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 jobs per request' },
        { status: 400 }
      );
    }

    logger.info({
      msg: 'Batch match calculation requested',
      userId,
      jobCount: jobIds.length,
      options,
    });

    // Check cache for existing matches
    const cachedMatches = matchScoreCache.getMany(userId, jobIds);
    const jobsToCalculate: string[] = [];

    for (const [jobId, cachedMatch] of cachedMatches.entries()) {
      if (!cachedMatch) {
        jobsToCalculate.push(jobId);
      }
    }

    logger.debug({
      msg: 'Cache results',
      userId,
      totalJobs: jobIds.length,
      cachedHits: jobIds.length - jobsToCalculate.length,
      toCalculate: jobsToCalculate.length,
    });

    // Calculate missing matches
    const newMatches = await calculateMatches(userId, jobsToCalculate, options);

    // Check if user has a profile
    const extractedProfile = await getExtractedProfile(userId);
    const hasProfile =
      !!extractedProfile && isProfileReadyForMatching(extractedProfile);

    // Cache new matches
    if (newMatches.length > 0) {
      matchScoreCache.setMany(userId, newMatches);
    }

    // Combine cached and new matches
    const allMatches = jobIds.map(jobId => {
      const cached = cachedMatches.get(jobId);
      if (cached) {
        return {
          jobId,
          score: cached.score,
          factors: cached.factors,
          reasoning: cached.reasoning,
          calculatedAt: cached.calculatedAt,
          cached: true,
        };
      }

      const newMatch = newMatches.find(m => m.jobId === jobId);
      if (newMatch) {
        return {
          jobId,
          score: newMatch.score,
          factors: newMatch.factors,
          reasoning: newMatch.reasoning,
          calculatedAt: newMatch.calculatedAt,
          cached: false,
        };
      }

      // Job not found or calculation failed
      return null;
    });

    // Filter out nulls
    const validMatches = allMatches.filter(m => m !== null);

    const processingTime = Date.now() - startTime;

    logger.info({
      msg: 'Batch match calculation completed',
      userId,
      totalJobs: jobIds.length,
      successfulMatches: validMatches.length,
      cachedMatches: jobIds.length - jobsToCalculate.length,
      calculatedMatches: newMatches.length,
      processingTime,
    });

    return NextResponse.json({
      success: true,
      hasProfile,
      matches: validMatches,
      stats: {
        total: jobIds.length,
        cached: jobIds.length - jobsToCalculate.length,
        calculated: newMatches.length,
        processingTime,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Batch match calculation API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/batch-score
 *
 * Returns cache statistics
 */
export async function GET(_req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = matchScoreCache.getStats();

    return NextResponse.json({
      cache: {
        size: stats.size,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: Math.round(stats.hitRate * 100) / 100,
        expired: stats.expired,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Cache stats API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate matches for multiple jobs
 */
async function calculateMatches(
  userId: string,
  jobIds: string[],
  options: MatchingOptions
) {
  if (jobIds.length === 0) {
    return [];
  }

  try {
    // Build candidate profile once
    const candidateProfile = await buildCandidateProfile(userId);
    if (!candidateProfile) {
      logger.warn({
        msg: 'Could not build candidate profile',
        userId,
      });
      return [];
    }

    // Calculate matches in parallel
    const matchPromises = jobIds.map(async jobId => {
      try {
        const job = await getJobById(jobId);
        if (!job) {
          logger.warn({
            msg: 'Job not found',
            jobId,
          });
          return null;
        }

        const matchResult = await jobCandidateMatchingService.calculateMatch(
          job,
          candidateProfile,
          options
        );

        if (!matchResult.ok) {
          logger.warn({
            msg: 'Match calculation failed',
            userId,
            jobId,
            error: matchResult.error.message,
          });
          return null;
        }

        // Override jobId to use the requested ID format (workableId or _id)
        const match = matchResult.value;
        return {
          ...match,
          jobId, // Use the original requested jobId instead of job._id
        };
      } catch (error) {
        logger.error({
          msg: 'Error calculating match',
          userId,
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const results = await Promise.all(matchPromises);
    return results.filter(match => match !== null);
  } catch (error) {
    logger.error({
      msg: 'Failed to calculate matches',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Helper function to get job by ID
 * Queries the job repository for active jobs only
 * Tries both MongoDB ID and Workable ID
 */
async function getJobById(jobId: string): Promise<Job | null> {
  try {
    // Try MongoDB ID first
    let job = await jobRepo.findById(jobId);

    // If not found, try Workable ID
    if (!job) {
      job = await jobRepo.findByWorkableId(jobId);
    }

    // Only return active jobs for matching
    if (job && job.status === 'active') {
      return job;
    }

    logger.warn({
      msg: 'Job not found or not active',
      jobId,
      found: !!job,
      status: job?.status,
    });

    return null;
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch job',
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Helper function to build candidate profile
 * Uses the profile transformer utility for consistent profile building
 */
async function buildCandidateProfile(
  userId: string
): Promise<CandidateProfile | null> {
  try {
    const extractedProfile = await getExtractedProfile(userId);
    if (!extractedProfile) {
      logger.warn({
        msg: 'No extracted profile found',
        userId,
      });
      return null;
    }

    // Validate profile is ready for matching
    if (!isProfileReadyForMatching(extractedProfile)) {
      logger.warn({
        msg: 'Profile not ready for matching',
        userId,
        status: extractedProfile.extractionStatus,
        hasError: !!extractedProfile.extractionError,
      });
      return null;
    }

    // Get vector embeddings
    const vectorDoc = await resumeVectorRepo.getByUserId(userId);
    const vector = vectorDoc?.[0]?.embeddings;

    // Use transformer utility for consistent conversion
    const candidateProfile = extractedProfileToCandidateProfile(
      userId,
      extractedProfile,
      vector
      // TODO: Load user preferences from user settings/profile
      // For now, preferences are undefined and will use defaults
    );

    return candidateProfile;
  } catch (error) {
    logger.error({
      msg: 'Failed to build candidate profile',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
