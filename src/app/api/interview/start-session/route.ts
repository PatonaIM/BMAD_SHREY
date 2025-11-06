import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { logger } from '../../../../monitoring/logger';
import { generateSessionToken } from '../../../../utils/sessionToken';
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
    const { jobId, applicationId, questions, metadata } = body;

    // Validate required fields
    if (!applicationId) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId is required',
          },
        },
        400
      );
    }

    // Fetch application to get jobId if not provided
    const application = await applicationRepo.findById(applicationId);
    if (!application) {
      logger.warn({
        event: 'start_session_application_not_found',
        applicationId,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          },
        },
        404
      );
    }

    // Verify user owns this application
    if (application.userId !== user._id) {
      logger.warn({
        event: 'start_session_unauthorized_application',
        userId: user._id,
        applicationId,
        applicationUserId: application.userId,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to start session for this application',
          },
        },
        403
      );
    }

    // Use jobId from application if not provided in request
    const finalJobId = jobId || application.jobId;

    // Questions are now optional - AI generates them dynamically during interview
    const questionsList = Array.isArray(questions) ? questions : [];

    logger.info({
      event: 'start_session_creating',
      userId: user._id,
      jobId: finalJobId,
      applicationId,
      questionCount: questionsList.length,
    });

    // Calculate estimated duration from questions (or default if no questions)
    const estimatedDuration =
      questionsList.length > 0
        ? (questionsList as InterviewQuestion[]).reduce(
            (sum, q) => sum + (q.expectedDuration || 120),
            0
          )
        : 600; // Default 10 minutes for dynamic interviews

    // Create interview session
    const session = await interviewSessionRepo.create({
      userId: user._id,
      jobId: finalJobId,
      applicationId,
      questions: questionsList as InterviewQuestion[],
      estimatedDuration,
      metadata,
    });

    // Link interview session to application
    await applicationRepo.linkInterviewSession(
      applicationId,
      session.sessionId
    );

    // Generate session token for authentication
    const token = generateSessionToken(session.sessionId, applicationId);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    logger.info({
      event: 'start_session_success',
      userId: user._id,
      sessionId: session.sessionId,
      questionCount: questionsList.length,
    });

    return json({
      ok: true,
      value: {
        sessionId: session.sessionId,
        token,
        expiresAt,
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
