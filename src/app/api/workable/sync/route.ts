import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { syncWorkableJobs } from '../../../../services/workable/syncService';
import { requireRole } from '../../../../auth/roleGuard';

export async function POST() {
  const session = await getServerSession(authOptions);
  try {
    const roles: string[] | undefined = Array.isArray(
      (session?.user as unknown as { roles?: unknown })?.roles
    )
      ? (session?.user as unknown as { roles?: string[] })?.roles
      : undefined;
    requireRole(['ADMIN'], roles);
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  try {
    const summary = await syncWorkableJobs();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      { error: 'SYNC_FAILED', message: (err as Error).message },
      { status: 500 }
    );
  }
}
