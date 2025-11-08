import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '../../../../config/env';
import {
  storeGoogleCalendarTokens,
  findUserById,
} from '../../../../data-access/repositories/userRepo';
import { logger } from '../../../../monitoring/logger';

const env = getEnv();

/**
 * Calendar OAuth callback handler
 * Exchanges authorization code for tokens and stores in database
 *
 * GET /api/auth/calendar-callback?code=xxx&state=userId
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // User ID from state parameter
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    logger.error({ msg: 'Calendar OAuth error', error });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/recruiter?calendar_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !userId) {
    logger.error({ msg: 'Missing code or userId in calendar callback' });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/recruiter?calendar_error=missing_params`
    );
  }

  // Verify user exists
  const user = await findUserById(userId);
  if (!user) {
    logger.error({ msg: 'User not found in calendar callback', userId });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/recruiter?calendar_error=invalid_user`
    );
  }

  try {
    // Exchange authorization code for tokens
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${baseUrl}/api/auth/calendar-callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logger.error({
        msg: 'Failed to exchange code for tokens',
        error: errorData,
      });
      return NextResponse.redirect(
        `${baseUrl}/recruiter?calendar_error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in database
    await storeGoogleCalendarTokens(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
      connectedAt: new Date().toISOString(),
    });

    logger.info({
      msg: 'Calendar tokens stored successfully',
      userId,
      scope: tokens.scope,
    });

    // Redirect back to recruiter dashboard with success
    return NextResponse.redirect(
      `${baseUrl}/recruiter?calendar_connected=true`
    );
  } catch (error) {
    logger.error({
      msg: 'Error in calendar callback',
      error: (error as Error).message,
    });
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/recruiter?calendar_error=unknown`
    );
  }
}
