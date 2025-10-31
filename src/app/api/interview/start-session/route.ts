import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { logger } from '../../../../monitoring/logger';
import type { InterviewQuestion } from '../../../../shared/types/interview';

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
 * POST /api/interview/start-session
 *
 * Create a new interview session
 *
 * Body:
 * - jobId: string (MongoDB ObjectId)
 * - applicationId: string (MongoDB ObjectId)
 * - questions: InterviewQuestion[]
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'start_session_no_session' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'start_session_user_not_found', email });
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    const body = await req.json();
    const { jobId, applicationId, questions } = body;

    // Validate required fields
    if (!jobId || !applicationId || !questions || !Array.isArray(questions)) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'jobId, applicationId, and questions array are required',
          },
        },
        400
      );
    }

    if (questions.length === 0) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'At least one question is required',
          },
        },
        400
      );
    }

    logger.info({
      event: 'start_session_creating',
      userId: user._id,
      jobId,
      applicationId,
      questionCount: questions.length,
    });

    // Calculate estimated duration from questions
    const estimatedDuration = (questions as InterviewQuestion[]).reduce(
      (sum, q) => sum + (q.expectedDuration || 120),
      0
    );

    // Create interview session
    const session = await interviewSessionRepo.create({
      userId: user._id,
      jobId,
      applicationId,
      questions: questions as InterviewQuestion[],
      estimatedDuration,
    });

    logger.info({
      event: 'start_session_success',
      userId: user._id,
      sessionId: session.sessionId,
      questionCount: questions.length,
    });

    return json({
      ok: true,
      value: {
        sessionId: session.sessionId,
        status: session.status,
        questions: session.questions,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'start_session_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
