import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import Link from 'next/link';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { getResume } from '../../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { ApplyForm } from '../../../../components/ApplyForm';

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

  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;

  if (!userSession?.email) {
    redirect(`/login?redirect=/jobs/${id}/apply`);
  }

  // For OAuth users, use the user ID from session; for credential users, look up by email
  let userId: string;
  if (userSession.id) {
    // OAuth user - use ID from session
    userId = userSession.id;
  } else {
    // Credential user - look up by email
    const user = await findUserByEmail(userSession.email);
    if (!user) {
      redirect(`/login?redirect=/jobs/${id}/apply`);
    }
    userId = user._id;
  }

  const existing = await applicationRepo.findByUserEmailAndJob(
    userSession.email,
    job._id
  );

  // Get user's existing resume if any
  const resumeDoc = await getResume(userId);

  // Serialize resume data for client component (convert to plain objects)
  const serializedResume = resumeDoc
    ? {
        currentVersionId: resumeDoc.currentVersionId,
        versions: resumeDoc.versions.map(v => ({
          versionId: v.versionId,
          fileName: v.fileName,
          storedAt: v.storedAt,
          fileSize: v.fileSize,
        })),
      }
    : undefined;

  // Check if user has any previous applications
  const userApplications = await applicationRepo.findByUserEmail(
    userSession.email,
    5
  );
  const hasPreviousApplications = userApplications.length > 0;

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Apply to {job.title}</h1>

      {/* Show existing resume info if user has applied before */}
      {hasPreviousApplications && serializedResume && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Your Existing Resume
          </h3>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Current Resume:
              </span>{' '}
              <Link
                href={`/resume/${serializedResume.currentVersionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                {serializedResume.versions.find(
                  v => v.versionId === serializedResume.currentVersionId
                )?.fileName || 'View Resume'}
              </Link>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Total Resume Versions:
              </span>{' '}
              <span className="font-medium">
                {serializedResume.versions.length}
              </span>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Previous Applications:
              </span>{' '}
              <span className="font-medium">{userApplications.length}</span>
            </div>
          </div>
        </div>
      )}

      {existing ? (
        <div className="card p-4 mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-sm">
          You already applied to this job. Application ID: {existing._id}
        </div>
      ) : (
        <ApplyForm jobId={job._id} existingResume={serializedResume} />
      )}
      <Link
        href={`/jobs/${job.workableId || job._id}`}
        className="btn-outline px-4 py-2 text-sm inline-block mt-4"
      >
        Back to Job
      </Link>
    </main>
  );
}
