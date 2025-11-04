import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { logger } from '../../../../monitoring/logger';

/**
 * GET /api/applications/top-matches
 * Fetch user's top 5 applications by match score (>50%)
 * For QuickPicksWidget on dashboard (EP3-S10)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session
      ? (session.user as typeof session.user & { id?: string })
      : undefined;
    if (!userSession?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userSession.id;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    // Fetch top matches from repository
    const topMatches = await applicationRepo.findTopMatches(userId, limit);

    return NextResponse.json({
      success: true,
      topMatches,
      count: topMatches.length,
    });
  } catch (error) {
    logger.error('Error fetching top matches:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch top matches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
