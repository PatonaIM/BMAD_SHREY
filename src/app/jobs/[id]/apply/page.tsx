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

  const userEmail = (session.user as { email?: string })?.email;
  if (!userEmail) {
    redirect(`/login?redirect=/jobs/${id}/apply`);
  }

  // Find user by email to get MongoDB user ID
  const user = await findUserByEmail(userEmail);
  if (!user) {
    redirect(`/login?redirect=/jobs/${id}/apply`);
  }

  const existing = await applicationRepo.findByUserEmailAndJob(
    userEmail,
    job._id
  );

  // Get user's existing resume if any
  const resumeDoc = await getResume(user._id);

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

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Apply to {job.title}</h1>
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
