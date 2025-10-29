import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string })
    : undefined;
  if (!userSession?.id) {
    redirect(`/login?redirect=/dashboard`);
  }
  const userId = userSession.id as string;
  const apps = await applicationRepo.findByUser(userId, 100);
  const enriched = await applicationRepo.enrichListItems(apps);
  const latestJobs = (await jobRepo.search({ page: 1, limit: 5 })).jobs;

  return (
    <div className="flex flex-col gap-12">
      <header
        aria-labelledby="dashboard-heading"
        className="flex flex-col gap-2"
      >
        <h1
          id="dashboard-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          Your Dashboard
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Track your applications and explore new opportunities.
        </p>
      </header>

      <section
        aria-labelledby="applications-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="applications-heading" className="text-xl font-semibold">
          Applications
        </h2>
        {enriched.length === 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You haven't applied to any jobs yet. Browse roles and apply to get
              started.
            </p>
            <Link
              href="/"
              className="inline-flex mt-3 btn-primary px-4 py-2 text-sm"
            >
              Browse Roles
            </Link>
          </div>
        )}
        <div className="space-y-4">
          {enriched.map(app => (
            <div
              key={app._id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 shadow-sm"
            >
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                {app.jobTitle}{' '}
                <span className="text-xs text-neutral-500">
                  @ {app.company}
                </span>
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Applied {app.appliedAt.toLocaleDateString()} • Status:{' '}
                {app.status}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${app.status === 'submitted' ? 'bg-brand-primary/10 text-brand-primary ring-brand-primary/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-neutral-300 dark:ring-neutral-700'}`}
                >
                  {app.status}
                </span>
                {typeof app.matchScore === 'number' && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-1 ring-neutral-300 dark:ring-neutral-700">
                    Match {app.matchScore}
                  </span>
                )}
              </div>
              {app.lastEventStatus && (
                <p className="mt-2 text-[10px] text-neutral-500">
                  Last update: {app.lastEventStatus} on{' '}
                  {app.lastEventAt?.toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/applications/${app._id}`}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="latest-jobs-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="latest-jobs-heading" className="text-xl font-semibold">
          Latest Jobs
        </h2>
        <div className="space-y-4">
          {latestJobs.map(job => (
            <div
              key={job._id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 shadow-sm"
            >
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                {job.title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {job.company}
                {job.location ? ` • ${job.location}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {job.skills.slice(0, 3).map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-1 ring-neutral-300 dark:ring-neutral-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/jobs/${job.workableId || job._id}`}
                  className="btn-outline px-3 py-1.5 text-xs"
                >
                  Details
                </Link>
                <Link
                  href={`/jobs/${job.workableId || job._id}/apply`}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
