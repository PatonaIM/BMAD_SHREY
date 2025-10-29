import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../data-access/repositories/jobRepo';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string })
    : undefined;
  if (!userSession?.id) redirect(`/login?redirect=/applications/${id}`);
  const app = await applicationRepo.findById(id);
  if (!app) return notFound();
  if (app.userId !== userSession.id) return notFound();
  const job = await jobRepo.findById(app.jobId);
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-6">Application Details</h1>
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm mb-6">
        <h2 className="text-lg font-medium mb-1">
          {job?.title || 'Unknown Role'}
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
          {job?.company || 'Unknown Company'} • Applied{' '}
          {app.appliedAt.toLocaleDateString()}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/30">
            {app.status}
          </span>
          {typeof app.matchScore === 'number' && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ring-1 ring-neutral-300 dark:ring-neutral-700">
              Match {app.matchScore}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold mb-2">Timeline</h3>
        <ul className="space-y-1 text-xs">
          {app.timeline.map((e, i) => (
            <li key={i} className="text-neutral-700 dark:text-neutral-300">
              <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                {e.timestamp.toLocaleString()}
              </span>{' '}
              – <span className="font-medium">{e.status}</span> ({e.actorType}
              {e.actorId ? `:${e.actorId}` : ''}) {e.note ? `– ${e.note}` : ''}
            </li>
          ))}
        </ul>
      </div>
      {job?.description && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Job Snapshot</h3>
          <p className="text-xs whitespace-pre-line text-neutral-700 dark:text-neutral-300">
            {job.description.slice(0, 600)}
            {job.description.length > 600 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
