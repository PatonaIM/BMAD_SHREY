import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { interviewQuestionGenerator } from '../../../../services/ai/interviewQuestions';
import { logger } from '../../../../monitoring/logger';
import { ObjectId } from 'mongodb';
import { getMongoClient } from '../../../../data-access/mongoClient';
import type { Job } from '../../../../shared/types/job';

interface SessionUser {
  email?: string;
}

interface SafeSession {
  user?: SessionUser;
}

function json(result: unknown, status = 200) {
  return NextResponse.json(result, { status });
}

async function getSessionUserEmail(): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as SafeSession | null;
  return session?.user?.email || null;
}

/**
 * POST /api/interview/generate-questions
 *
 * Generate interview questions for a specific job and candidate
 *
 * Body:
 * - jobId: string (MongoDB ObjectId)
 * - applicationId?: string (optional, for tracking)
 * - options?: QuestionGenerationOptions
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'generate_questions_no_session' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'generate_questions_user_not_found', email });
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    const body = await req.json();
    const { jobId, applicationId, options } = body;

    if (!jobId) {
      return json(
        {
          ok: false,
          error: { code: 'INVALID_REQUEST', message: 'jobId is required' },
        },
        400
      );
    }

    logger.info({
      event: 'generate_questions_started',
      userId: user._id,
      jobId,
      applicationId,
    });

    // Fetch job details
    const mongoClient = await getMongoClient();
    const jobsCollection = mongoClient.db().collection('jobs');
    const job = (await jobsCollection.findOne({
      _id: new ObjectId(jobId),
    })) as Job | null;

    if (!job) {
      logger.warn({ event: 'generate_questions_job_not_found', jobId });
      return json(
        {
          ok: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Job not found' },
        },
        404
      );
    }

    // Fetch candidate profile
    const profile = await getExtractedProfile(user._id);
    if (!profile) {
      logger.warn({
        event: 'generate_questions_profile_not_found',
        userId: user._id,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message:
              'Candidate profile not found. Please create a profile first.',
          },
        },
        404
      );
    }

    // Generate questions
    const result = await interviewQuestionGenerator.generateQuestions(
      job,
      profile,
      options
    );

    logger.info({
      event: 'generate_questions_success',
      userId: user._id,
      jobId,
      questionCount: result.questions.length,
      estimatedDuration: result.totalEstimatedDuration,
    });

    return json({
      ok: true,
      value: {
        questions: result.questions,
        totalEstimatedDuration: result.totalEstimatedDuration,
        metadata: result.generationMetadata,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'generate_questions_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
