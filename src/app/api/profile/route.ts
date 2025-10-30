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
import { ok, err } from '../../../shared/result';

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

    // Attempt to derive latest editable profile from latest version; fallback to extracted profile
    const editingService = new ProfileEditingService(user._id);
    const versionsRes = await editingService.list(1);
    let profileSource: EditableProfile | null = null;
    if (versionsRes.ok && versionsRes.value.length && versionsRes.value[0]) {
      profileSource = versionsRes.value[0].profile;
    } else {
      profileSource = await getExtractedProfile(user._id);
    }
    if (!profileSource)
      return json(err('PROFILE_NOT_FOUND', 'No profile data').error, 404);

    const { searchParams } = new URL(req.url);
    const includeCompleteness =
      searchParams.get('computeCompleteness') === 'true';
    const completeness = includeCompleteness
      ? computeCompleteness(profileSource)
      : null;

    return json(
      ok({
        profile: profileSource,
        completeness:
          completeness && completeness.ok ? completeness.value : null,
      })
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
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
