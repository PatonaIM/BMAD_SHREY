import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { requireRole } from '../../../../auth/roleGuard';
import { batchHydrateJobs } from '../../../../services/workable/hydrateService';

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
  const summary = await batchHydrateJobs();
  return NextResponse.json({ ok: true, summary });
}
