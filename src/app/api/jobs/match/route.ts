import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { jobCandidateMatchingService } from '../../../../services/ai/jobCandidateMatching';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { resumeVectorRepo } from '../../../../data-access/repositories/resumeVectorRepo';
import { logger } from '../../../../monitoring/logger';
import type { CandidateProfile } from '../../../../shared/types/matching';
import type { Job } from '../../../../shared/types/job';

interface SessionUser {
  id?: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { jobId, options = {} } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.info({
      msg: 'Match calculation requested',
      userId: user._id,
      jobId,
      options,
    });

    // Get job details
    const job = await getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Build candidate profile
    const candidateProfile = await buildCandidateProfile(user._id);
    if (!candidateProfile) {
      return NextResponse.json(
        { error: 'Candidate profile not found' },
        { status: 404 }
      );
    }

    // Calculate match
    const matchResult = await jobCandidateMatchingService.calculateMatch(
      job,
      candidateProfile,
      options
    );

    if (!matchResult.ok) {
      logger.error({
        msg: 'Match calculation failed',
        userId: user._id,
        jobId,
        error: matchResult.error.message,
      });
      return NextResponse.json(
        { error: matchResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match: {
        jobId: matchResult.value.jobId,
        score: matchResult.value.score,
        reasoning: matchResult.value.reasoning,
        calculatedAt: matchResult.value.calculatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Match calculation API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return matching statistics
    const stats = jobCandidateMatchingService.getStats();

    return NextResponse.json({
      stats: {
        totalCalculations: stats.totalCalculations,
        averageProcessingTime: Math.round(stats.averageProcessingTime),
        topMatchScore: Math.round(stats.topMatchScore),
        averageMatchScore: Math.round(stats.averageMatchScore),
        lastCalculatedAt: stats.lastCalculatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Match stats API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get job by ID
 * In production, this would use the job repository
 */
async function getJobById(jobId: string): Promise<Job | null> {
  // Placeholder implementation
  // In production, this would query the jobs collection
  try {
    // For now, return a mock job for development
    const mockJob: Job = {
      _id: jobId,
      workableId: 'workable-123',
      title: 'Senior Software Engineer',
      description: 'Build scalable web applications using modern technologies',
      requirements: 'Experience with React, Node.js, and TypeScript',
      location: 'San Francisco, CA',
      department: 'Engineering',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      salary: {
        min: 120000,
        max: 180000,
        currency: 'USD',
      },
      company: 'TechCorp Inc',
      companyDescription: 'Leading technology company',
      status: 'active',
      postedAt: new Date('2023-10-01'),
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'MongoDB'],
      createdAt: new Date('2023-10-01'),
      updatedAt: new Date('2023-10-30'),
      lastSyncedAt: new Date('2023-10-30'),
    };

    return mockJob;
  } catch {
    return null;
  }
}

/**
 * Helper function to build candidate profile from extracted data
 */
async function buildCandidateProfile(
  userId: string
): Promise<CandidateProfile | null> {
  try {
    // Get extracted profile
    const extractedProfile = await getExtractedProfile(userId);
    if (!extractedProfile) {
      return null;
    }

    // Get vector embeddings
    const vectorDoc = await resumeVectorRepo.getByUserId(userId);
    const vector = vectorDoc?.[0]?.embeddings;

    const candidateProfile: CandidateProfile = {
      userId,
      summary: extractedProfile.summary,
      skills: extractedProfile.skills || [],
      experience: extractedProfile.experience || [],
      education: extractedProfile.education || [],
      vector,
      // Placeholder preferences - in production, these would come from user settings
      preferences: {
        locations: ['San Francisco', 'Remote'],
        employmentTypes: ['full-time'],
        salaryRange: {
          min: 100000,
          max: 200000,
          currency: 'USD',
        },
        remoteWork: true,
      },
    };

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
