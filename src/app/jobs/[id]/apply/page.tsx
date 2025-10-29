import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import Link from 'next/link';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next.js v15 expects params as Promise
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?redirect=/jobs/${id}/apply`);
  }
  const job =
    (await jobRepo.findByWorkableId(id)) || (await jobRepo.findById(id));
  if (!job) return notFound();
  const userId = (session.user as { id?: string })?.id;
  if (!userId) {
    redirect(`/login?redirect=/jobs/${id}/apply`);
  }
  const existing = await applicationRepo.findByUserAndJob(userId, job._id);

  // Placeholder until application repository & workflow is implemented
  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Apply to {job.title}</h1>
      {existing ? (
        <div className="card p-4 mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-sm">
          You already applied to this job. Application ID: {existing._id}
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
            Submit a simple application. Resume URL and cover letter are
            optional for MVP. Duplicate applications are prevented.
          </p>
          <form
            action={`/jobs/${id}/apply`}
            method="post"
            encType="multipart/form-data"
            className="flex flex-col gap-3 mb-4"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="resumeUrl" className="text-xs font-medium">
                Resume URL
              </label>
              <input
                id="resumeUrl"
                name="resumeUrl"
                placeholder="https://..."
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="coverLetter" className="text-xs font-medium">
                Cover Letter
              </label>
              <textarea
                id="coverLetter"
                name="coverLetter"
                placeholder="Optional cover letter"
                rows={5}
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary px-5 py-2 text-sm">
              Submit Application
            </button>
          </form>
        </>
      )}
      <Link
        href={`/jobs/${job.workableId || job._id}`}
        className="btn-outline px-4 py-2 text-sm inline-block"
      >
        Back to Job
      </Link>
    </main>
  );
}
