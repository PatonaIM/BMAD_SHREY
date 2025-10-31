import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
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
 * POST /api/interview/realtime-token
 *
 * Generate ephemeral OpenAI Realtime API session token
 *
 * Body:
 * - sessionId: string (interview session ID)
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'realtime_token_no_session' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'realtime_token_user_not_found', email });
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

    logger.info({
      event: 'realtime_token_generating',
      userId: user._id,
      sessionId,
    });

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error({ event: 'realtime_token_missing_api_key' });
      return json(
        {
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'OpenAI API key not configured',
          },
        },
        500
      );
    }

    // Create ephemeral token via OpenAI API
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({
        event: 'realtime_token_openai_error',
        status: response.status,
        error: errorText,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'OPENAI_ERROR',
            message: 'Failed to generate realtime token',
          },
        },
        response.status
      );
    }

    const data = await response.json();

    logger.info({
      event: 'realtime_token_success',
      userId: user._id,
      sessionId,
    });

    return json({
      ok: true,
      value: {
        token: data.client_secret?.value || data.token,
        expiresAt: data.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'realtime_token_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
