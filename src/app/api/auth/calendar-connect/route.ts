import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { getEnv } from '../../../../config/env';

const env = getEnv();

/**
 * Separate OAuth endpoint for Google Calendar permissions
 * Only requests Calendar scopes, initiated by recruiters from dashboard
 *
 * GET /api/auth/calendar-connect
 * Redirects to Google OAuth with Calendar scopes
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract base URL from request
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Build Google OAuth URL with Calendar scopes
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${baseUrl}/api/auth/calendar-callback`,
    response_type: 'code',
    scope:
      'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh_token
    state: (session.user as { id?: string }).id || '', // Pass user ID in state for callback
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
