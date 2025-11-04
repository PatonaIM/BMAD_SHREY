import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { matchScoreCache } from '../../../../services/ai/matchScoreCache';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { jobCandidateMatchingService } from '../../../../services/ai/jobCandidateMatching';
import { resumeVectorRepo } from '../../../../data-access/repositories/resumeVectorRepo';
import { extractedProfileToCandidateProfile } from '../../../../components/matching/profileTransformer';
import { logger } from '../../../../monitoring/logger';
import type { CandidateProfile } from '../../../../shared/types/matching';

interface SessionUser {
  id: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptions
  )) as unknown as SafeSession;

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, resumeVersionId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Find user by email to get MongoDB _id
    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id;
    const candidateEmail = session.user.email;

    // Get job details - try both MongoDB ID and Workable ID
    let job = await jobRepo.findById(jobId);
    if (!job) {
      job = await jobRepo.findByWorkableId(jobId);
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if already applied - use the found job's MongoDB ID
    const existing = await applicationRepo.findByUserEmailAndJob(
      candidateEmail,
      job._id
    );
    if (existing) {
      return NextResponse.json(
        { error: 'Already applied to this job' },
        { status: 409 }
      );
    }

    // Create application with job details - use the found job's MongoDB ID
    const application = await applicationRepo.create(
      userId,
      job._id, // Use the actual job's MongoDB ID
      candidateEmail,
      job.title,
      job.company,
      resumeVersionId
    );

    // Calculate match score for post-application guidance (EP3-S9)
    let matchScore = 0;
    let scoreBreakdown = null;

    try {
      // Check cache first
      const cachedMatch = matchScoreCache.get(userId, job._id);
      if (cachedMatch) {
        matchScore = cachedMatch.score.overall;
        scoreBreakdown = {
          skills: cachedMatch.score.skills,
          experience: cachedMatch.score.experience,
          semantic: cachedMatch.score.semantic,
          other: cachedMatch.score.other,
        };
      } else {
        // Calculate fresh if not in cache
        const extractedProfile = await getExtractedProfile(userId);
        if (extractedProfile) {
          // Build candidate profile for matching
          const resumeVectors = await resumeVectorRepo.getByUserId(userId);
          const resumeVector = resumeVectors[0];
          const candidateProfile: CandidateProfile =
            extractedProfileToCandidateProfile(
              userId,
              extractedProfile,
              resumeVector?.embeddings
            );

          // Calculate match
          const matchResult = await jobCandidateMatchingService.calculateMatch(
            job,
            candidateProfile
          );

          if (matchResult.ok) {
            matchScore = matchResult.value.score.overall;
            scoreBreakdown = {
              skills: matchResult.value.score.skills,
              experience: matchResult.value.score.experience,
              semantic: matchResult.value.score.semantic,
              other: matchResult.value.score.other,
            };

            // Cache for future use
            matchScoreCache.set(userId, job._id, matchResult.value);
          }
        }
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to calculate match score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue without score - not critical
    }

    return NextResponse.json(
      {
        success: true,
        applicationId: application._id,
        matchScore,
        scoreBreakdown,
        jobTitle: job.title,
        jobCompany: job.company,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to submit application',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
