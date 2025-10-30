import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { getSessionUserId } from '../../../../auth/sessionHelpers';
import { getExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';

interface SessionUser {
  id?: string;
  email: string;
}

interface SafeSession {
  user?: SessionUser;
}

export async function GET(_req: NextRequest) {
  const session = (await getServerSession(
    authOptions
  )) as unknown as SafeSession;

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Get user ID using helper (handles both OAuth and credentials users)
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const profile = await getExtractedProfile(userId);

    if (!profile) {
      return NextResponse.json({
        ok: true,
        value: {
          status: 'not_started',
          hasProfile: false,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      value: {
        status: profile.extractionStatus,
        hasProfile: true,
        extractedAt: profile.extractedAt,
        skillCount: profile.skills?.length || 0,
        experienceCount: profile.experience?.length || 0,
        educationCount: profile.education?.length || 0,
        error: profile.extractionError,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to check extraction status',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
