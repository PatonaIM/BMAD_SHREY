import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { logger } from '../../../../monitoring/logger';
import {
  calculateInterviewScores,
  calculateScoreBoost,
} from '../../../../services/ai/interviewScoring';

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
 * POST /api/interview/calculate-scores
 *
 * Calculate interview performance scores from Q&A transcript
 *
 * Body:
 * - sessionId: string
 * - applyBoost?: boolean (default: false) - Apply score boost to application
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
    const { sessionId, applyBoost = false } = body;

    if (!sessionId) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required',
          },
        },
        400
      );
    }

    // Get interview session
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

    // Verify ownership
    if (session.userId !== user._id) {
      return json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to access this session',
          },
        },
        403
      );
    }

    // Check if Q&A transcript exists
    if (!session.qaTranscript || session.qaTranscript.length === 0) {
      return json(
        {
          ok: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No Q&A transcript available for scoring',
          },
        },
        400
      );
    }

    // Check if already scored
    if (session.scores) {
      return json({
        ok: true,
        value: {
          sessionId,
          scores: session.scores,
          cached: true,
          message: 'Scores already calculated',
        },
      });
    }

    // Get job context for better scoring
    const application = await applicationRepo.findById(session.applicationId);
    let jobContext;
    if (application) {
      jobContext = {
        title: application.jobTitle || 'Unknown',
        description: '', // Not stored in application
        requiredSkills: [], // Not stored in application
      };
    }

    // Calculate scores
    logger.info({
      event: 'calculating_interview_scores',
      sessionId,
      userId: user._id,
    });

    const { scores, feedback } = await calculateInterviewScores(
      session,
      jobContext
    );

    // Save scores to interview session
    await interviewSessionRepo.updateScores(sessionId, scores);

    // Apply score boost to application if requested
    let scoreBoost = 0;
    let newMatchScore;
    if (applyBoost && application) {
      const currentScore = application.matchScore || 0;
      scoreBoost = calculateScoreBoost(scores.overall, currentScore);
      newMatchScore = currentScore + scoreBoost;

      // Update application with interview completion
      await applicationRepo.updateInterviewCompletion(
        session.applicationId,
        scores.overall,
        currentScore
      );

      logger.info({
        event: 'application_score_boosted',
        applicationId: session.applicationId,
        oldScore: currentScore,
        newScore: newMatchScore,
        boost: scoreBoost,
      });
    }

    logger.info({
      event: 'interview_scores_calculated',
      sessionId,
      userId: user._id,
      overallScore: scores.overall,
      scoreBoost,
    });

    return json({
      ok: true,
      value: {
        sessionId,
        scores,
        feedback,
        scoreBoost: applyBoost ? scoreBoost : undefined,
        newMatchScore: applyBoost ? newMatchScore : undefined,
        cached: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'calculate_scores_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
