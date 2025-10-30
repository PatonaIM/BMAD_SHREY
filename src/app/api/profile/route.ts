import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';
import { getExtractedProfile } from '../../../data-access/repositories/extractedProfileRepo';
import { ProfileEditingService } from '../../../services/profile/profileEditingService';
import { computeCompleteness } from '../../../services/profile/completenessScoring';
import type {
  ApplyProfileChangesRequest,
  EditableProfile,
} from '../../../shared/types/profileEditing';
import { ok } from '../../../shared/result';
import { logger } from '../../../monitoring/logger';

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

export async function GET(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'profile_api_no_session' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }
    logger.info({ event: 'profile_api_lookup', email });
    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'profile_api_user_not_found', email });
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }
    logger.info({ event: 'profile_api_user_found', userId: user._id });

    // First check for extracted profile (primary source)
    let profileSource: EditableProfile | null = await getExtractedProfile(
      user._id
    );
    logger.info({
      event: 'profile_api_extracted_check',
      hasExtracted: !!profileSource,
    });

    // If extracted profile exists, check for newer version edits
    if (profileSource) {
      const editingService = new ProfileEditingService(user._id);
      const versionsRes = await editingService.list(1);
      logger.info({
        event: 'profile_api_version_check',
        hasVersions: versionsRes.ok && versionsRes.value.length > 0,
      });
      // Use version if it exists and is newer
      if (versionsRes.ok && versionsRes.value.length && versionsRes.value[0]) {
        profileSource = versionsRes.value[0].profile;
        logger.info({ event: 'profile_api_using_version' });
      }
    }

    if (!profileSource) {
      logger.warn({ event: 'profile_api_no_profile', userId: user._id });
      return json(
        {
          ok: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'No profile data' },
        },
        404
      );
    }

    const { searchParams } = new URL(req.url);
    const includeCompleteness =
      searchParams.get('computeCompleteness') === 'true';
    const completeness = includeCompleteness
      ? computeCompleteness(profileSource)
      : null;

    logger.info({ event: 'profile_api_success', userId: user._id });
    return json(
      ok({
        profile: profileSource,
        completeness:
          completeness && completeness.ok ? completeness.value : null,
      })
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ event: 'profile_api_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email)
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    const user = await findUserByEmail(email);
    if (!user)
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );

    const body: ApplyProfileChangesRequest & { includeDiff?: boolean } =
      await req.json();
    const includeDiff = body.includeDiff === true;
    const service = new ProfileEditingService(user._id);

    // Get previous version if we intend to compute diff
    let previousVersionProfile: EditableProfile | null = null;
    if (includeDiff) {
      const prevList = await service.list(1);
      if (prevList.ok && prevList.value.length && prevList.value[0]) {
        previousVersionProfile = prevList.value[0].profile;
      }
    }

    const applyRes = await service.applyEdits(body);
    if (!applyRes.ok) return json(applyRes, 400);

    let diff = null;
    if (includeDiff) {
      const diffRes = await service.diff({
        previous: previousVersionProfile,
        current: applyRes.value.profile,
        userId: user._id,
        versionId: applyRes.value.id,
      });
      diff = diffRes.ok ? diffRes.value : null;
    }

    return json(ok({ version: applyRes.value, diff }));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
