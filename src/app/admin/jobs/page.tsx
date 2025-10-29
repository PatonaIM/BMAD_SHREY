import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { jobRepo } from '../../../data-access/repositories/jobRepo';

export default async function AdminJobsPage() {
  const session = await getServerSession(authOptions);
  const roles: string[] | undefined = Array.isArray(
    (session?.user as unknown as { roles?: unknown })?.roles
  )
    ? (session?.user as unknown as { roles?: string[] })?.roles
    : undefined;
  if (!roles || !roles.includes('ADMIN')) return notFound();
  const lastSync = await jobRepo.getLastSyncTime();
  return (
    <main className="px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Job Administration</h1>
      <div className="mb-4 text-xs rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 text-blue-700 dark:text-blue-300">
        Last sync: {lastSync ? lastSync.toISOString() : 'Never'}
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <form action="/api/workable/sync" method="post">
          <button type="submit" className="btn-primary px-4 py-2 text-xs">
            Sync Workable Jobs
          </button>
        </form>
        <form action="/api/dev/seed-jobs" method="post">
          <button type="submit" className="btn-outline px-4 py-2 text-xs">
            Seed Sample Jobs (Dev)
          </button>
        </form>
        <Link href="/" className="text-xs text-brand-primary hover:underline">
          View Homepage
        </Link>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Ensure WORKABLE_SUBDOMAIN is just the subdomain (e.g. "teamified" not a
        full URL). Seed jobs are only available in non-production environments.
      </p>
    </main>
  );
}
