import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { ProfileEditingService } from '../../../../services/profile/profileEditingService';

interface SessionUser {
  email?: string;
}
interface SafeSession {
  user?: SessionUser;
}

function json(result: unknown, status = 200) {
  return NextResponse.json(result, { status });
}

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SafeSession | null;
    const email = session?.user?.email;
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

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || '25');
    const service = new ProfileEditingService(user._id);
    const listRes = await service.list(limit);
    return json(
      listRes.ok ? listRes : { ok: false, error: listRes.error },
      listRes.ok ? 200 : 400
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
