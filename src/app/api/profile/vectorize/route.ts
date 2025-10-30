import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { resumeVectorizationService } from '../../../../services/ai/resumeVectorization';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { logger } from '../../../../monitoring/logger';

interface SessionUser {
  id?: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { profileId, forceRefresh = false } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    logger.info({
      msg: 'Vectorization requested',
      userId: user._id,
      profileId,
      forceRefresh,
    });

    const result = await resumeVectorizationService.vectorizeProfile(
      user._id,
      profileId,
      { forceRefresh }
    );

    if (!result.ok) {
      logger.error({
        msg: 'Vectorization failed',
        userId: user._id,
        profileId,
        error: result.error.message,
      });
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vector: {
        profileId: result.value.profileId,
        dimensions: result.value.dimensions,
        model: result.value.model,
        version: result.value.version,
        createdAt: result.value.createdAt,
        updatedAt: result.value.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Vectorization API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const result = await resumeVectorizationService.getProfileVector(profileId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    if (!result.value) {
      return NextResponse.json({ vector: null });
    }

    return NextResponse.json({
      vector: {
        profileId: result.value.profileId,
        dimensions: result.value.dimensions,
        model: result.value.model,
        version: result.value.version,
        createdAt: result.value.createdAt,
        updatedAt: result.value.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({
      msg: 'Vector retrieval API error',
      error: message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
