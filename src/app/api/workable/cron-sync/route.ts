import { NextResponse } from 'next/server';
import { syncWorkableJobs } from '../../../../services/workable/syncService';
import { getEnv } from '../../../../config/env';

export async function POST(req: Request) {
  const env = getEnv();
  const authHeader = req.headers.get('authorization');
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
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
