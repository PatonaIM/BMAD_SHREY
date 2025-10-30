import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../auth/options';
import { findUserByEmail } from '../../../../../../data-access/repositories/userRepo';
import { ProfileEditingService } from '../../../../../../services/profile/profileEditingService';

interface SessionUser {
  email?: string;
}
interface SafeSession {
  user?: SessionUser;
}

function json(result: unknown, status = 200) {
  return NextResponse.json(result, { status });
}

export async function POST(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const email = ((await getServerSession(authOptions)) as SafeSession | null)
      ?.user?.email;
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
    const service = new ProfileEditingService(user._id);
    const restoreRes = await service.restoreVersion(context.params.id);
    return json(
      restoreRes.ok ? restoreRes : { ok: false, error: restoreRes.error },
      restoreRes.ok ? 200 : 400
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
