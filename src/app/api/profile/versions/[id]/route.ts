import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/options';
import { findUserByEmail } from '../../../../../data-access/repositories/userRepo';
import { getProfileVersion } from '../../../../../data-access/repositories/profileVersionRepo';

interface SessionUser {
  email?: string;
}
interface SafeSession {
  user?: SessionUser;
}

function json(result: unknown, status = 200) {
  return NextResponse.json(result, { status });
}

export async function GET(
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

    const versionRes = await getProfileVersion(user._id, context.params.id);
    return json(
      versionRes.ok ? versionRes : { ok: false, error: versionRes.error },
      versionRes.ok ? 200 : 404
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
