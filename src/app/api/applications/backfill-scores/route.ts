import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { jobCandidateMatchingService } from '../../../../services/ai/jobCandidateMatching';
import { matchScoreCache } from '../../../../services/ai/matchScoreCache';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { resumeVectorRepo } from '../../../../data-access/repositories/resumeVectorRepo';
import {
  extractedProfileToCandidateProfile,
  isProfileReadyForMatching,
} from '../../../../components/matching/profileTransformer';
import { logger } from '../../../../monitoring/logger';
import type { CandidateProfile } from '../../../../shared/types/matching';

/**
 * POST /api/applications/backfill-scores
 * Backfill match scores for existing applications
 *
 * For users with profiles who have old applications without match scores,
 * calculate and cache match scores for their applied jobs
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user?._id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's profile
    const extractedProfile = await getExtractedProfile(user._id);
    if (!extractedProfile) {
      return NextResponse.json(
        { error: 'No profile found. Please upload a resume first.' },
        { status: 400 }
      );
    }

    // Check if profile is ready
    if (!isProfileReadyForMatching(extractedProfile)) {
      return NextResponse.json(
        {
          error: 'Profile not ready for matching',
          status: extractedProfile.extractionStatus,
        },
        { status: 400 }
      );
    }

    // Get user's applications
    const applications = await applicationRepo.findByUser(user._id);
    if (applications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applications to backfill',
        processed: 0,
      });
    }

    // Build candidate profile
    const resumeVectors = await resumeVectorRepo.getByUserId(user._id);
    const resumeVector = resumeVectors[0]; // Get most recent
    const candidateProfile: CandidateProfile =
      extractedProfileToCandidateProfile(
        user._id,
        extractedProfile,
        resumeVector?.embeddings
      );

    let processed = 0;
    let cached = 0;
    let calculated = 0;
    let failed = 0;

    // Process each application
    for (const application of applications) {
      try {
        // Check if score already exists in cache
        const existing = matchScoreCache.get(user._id, application.jobId);
        if (existing) {
          cached++;
          continue;
        }

        // Fetch job
        const job = await jobRepo.findById(application.jobId);
        if (!job || job.status !== 'active') {
          logger.warn({
            msg: 'Job not found or inactive for backfill',
            jobId: application.jobId,
          });
          failed++;
          continue;
        }

        // Calculate match score
        const matchResult = await jobCandidateMatchingService.calculateMatch(
          job,
          candidateProfile
        );

        // Check if calculation was successful
        if (!matchResult.ok) {
          logger.error({
            msg: 'Match calculation failed',
            jobId: application.jobId,
            error: matchResult.error,
          });
          failed++;
          continue;
        }

        // Store in cache
        matchScoreCache.set(user._id, application.jobId, matchResult.value);
        calculated++;
        processed++;
      } catch (error) {
        logger.error({
          msg: 'Failed to backfill match score',
          applicationId: application._id,
          jobId: application.jobId,
          error,
        });
        failed++;
      }
    }

    logger.info({
      msg: 'Backfilled match scores',
      userId: user._id,
      total: applications.length,
      processed,
      cached,
      calculated,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Backfilled ${calculated} match scores`,
      stats: {
        total: applications.length,
        processed,
        cached,
        calculated,
        failed,
      },
    });
  } catch (error) {
    logger.error({ msg: 'Failed to backfill match scores', error });
    return NextResponse.json(
      { error: 'Failed to backfill match scores' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/applications/backfill-scores
 * Check if user needs backfill
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ needsBackfill: false });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user?._id) {
      return NextResponse.json({ needsBackfill: false });
    }

    // Get user's profile
    const extractedProfile = await getExtractedProfile(user._id);
    if (!extractedProfile || !isProfileReadyForMatching(extractedProfile)) {
      return NextResponse.json({ needsBackfill: false });
    }

    // Get user's applications
    const applications = await applicationRepo.findByUser(user._id);
    if (applications.length === 0) {
      return NextResponse.json({ needsBackfill: false });
    }

    // Check how many are missing from cache
    let missingCount = 0;
    for (const application of applications) {
      const existing = matchScoreCache.get(user._id, application.jobId);
      if (!existing) {
        missingCount++;
      }
    }

    return NextResponse.json({
      needsBackfill: missingCount > 0,
      total: applications.length,
      missing: missingCount,
    });
  } catch (error) {
    logger.error({ msg: 'Failed to check backfill status', error });
    return NextResponse.json({ needsBackfill: false });
  }
}
