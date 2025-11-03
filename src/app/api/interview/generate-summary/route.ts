import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { logger } from '../../../../monitoring/logger';
import { getOpenAI } from '../../../../ai/openai/client';

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
 * POST /api/interview/generate-summary
 *
 * Generate AI summary from Q&A transcript using GPT-4
 *
 * Body:
 * - sessionId: string
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
    const { sessionId } = body;

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

    // Verify session belongs to user and has Q&A transcript
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
            message: 'Not authorized to access this session',
          },
        },
        403
      );
    }

    if (!session.qaTranscript || session.qaTranscript.length === 0) {
      return json(
        {
          ok: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No Q&A transcript available for this interview',
          },
        },
        400
      );
    }

    // Check if summary already exists
    if (session.interviewSummary) {
      return json({
        ok: true,
        value: {
          sessionId,
          summary: session.interviewSummary,
          generatedAt: session.summaryGeneratedAt,
          cached: true,
        },
      });
    }

    // Prepare transcript for GPT-4
    const transcriptText = session.qaTranscript
      .map((qa, index) => {
        return `Q${index + 1} [${qa.questionCategory}]: ${qa.question}\nA${index + 1}: ${qa.answerText || '(No response)'}`;
      })
      .join('\n\n');

    // Get OpenAI client
    const openai = await getOpenAI();

    // Generate summary using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical interviewer analyzing candidate performance. 
Generate a concise 2-3 sentence summary of this interview that highlights:
1. The candidate's technical strengths and communication style
2. Key areas demonstrated (e.g., problem-solving, system design, behavioral skills)
3. Overall impression and readiness

Be specific and balanced. Focus on what was actually discussed in the Q&A.`,
        },
        {
          role: 'user',
          content: `Please summarize this interview transcript:\n\n${transcriptText}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('Failed to generate summary from GPT-4');
    }

    // Save summary to database
    const success = await interviewSessionRepo.updateSummary(
      sessionId,
      summary
    );

    if (!success) {
      logger.error({
        event: 'summary_save_failed',
        sessionId,
      });
      throw new Error('Failed to save summary');
    }

    logger.info({
      event: 'interview_summary_generated',
      sessionId,
      userId: user._id,
      summaryLength: summary.length,
    });

    return json({
      ok: true,
      value: {
        sessionId,
        summary,
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'generate_summary_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
