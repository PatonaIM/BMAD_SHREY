import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { logger } from '../../../../monitoring/logger';

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
 * POST /api/interview/update-scores
 *
 * Update interview session scores and Q&A transcript after completion
 *
 * Body:
 * - sessionId: string
 * - scores: { technical, communication, experience, overall, confidence }
 * - qaTranscript?: InterviewQAPair[] (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    const body = await req.json();
    const { sessionId, scores, qaTranscript } = body;

    if (!sessionId || !scores) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId and scores are required',
          },
        },
        400
      );
    }

    // Verify session belongs to user
    const session = await interviewSessionRepo.findBySessionId(sessionId);
    if (!session) {
      return json(
        {
          ok: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        },
        404
      );
    }

    if (session.userId !== user._id) {
      return json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to update this session',
          },
        },
        403
      );
    }

    // Update scores and Q&A transcript
    const updates: {
      scores: typeof scores;
      qaTranscript?: typeof qaTranscript;
      metadata?: Partial<typeof session.metadata>;
    } = { scores };

    if (
      qaTranscript &&
      Array.isArray(qaTranscript) &&
      qaTranscript.length > 0
    ) {
      updates.qaTranscript = qaTranscript;
      updates.metadata = {
        ...session.metadata,
        transcriptAvailable: true,
      };
    }

    const success = await interviewSessionRepo.updateScores(
      sessionId,
      updates.scores
    );

    if (!success) {
      return json(
        {
          ok: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update scores',
          },
        },
        500
      );
    }

    // Update Q&A transcript if provided
    if (updates.qaTranscript) {
      const transcriptSuccess = await interviewSessionRepo.updateQATranscript(
        sessionId,
        updates.qaTranscript
      );

      if (!transcriptSuccess) {
        logger.warn({
          event: 'qa_transcript_update_failed',
          sessionId,
        });
      }
    }

    // Update application with interview completion and score boost
    const application = await applicationRepo.findById(session.applicationId);
    if (application && application.matchScore !== undefined) {
      await applicationRepo.updateInterviewCompletion(
        session.applicationId,
        scores.overall,
        application.matchScore
      );
    }

    logger.info({
      event: 'interview_scores_updated',
      sessionId,
      userId: user._id,
      overall: scores.overall,
      qaTranscriptLength: qaTranscript?.length || 0,
    });

    return json({
      ok: true,
      value: { sessionId, scores, transcriptSaved: !!updates.qaTranscript },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'update_scores_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
