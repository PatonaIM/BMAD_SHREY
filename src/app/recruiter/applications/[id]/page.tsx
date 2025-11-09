import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '@/data-access/repositories/applicationRepo';
import { jobRepo } from '@/data-access/repositories/jobRepo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ApplicationTimeline } from '@/components/timeline';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecruiterApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;

  if (!userSession?.email) {
    redirect(`/login?redirect=/recruiter/applications/${id}`);
  }

  // Check if user has recruiter role
  const user = session?.user as { roles?: string[] } | undefined;
  if (!user?.roles?.includes('RECRUITER')) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  const app = await applicationRepo.findById(id);
  if (!app) return notFound();

  const job = await jobRepo.findById(app.jobId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/recruiter/jobs/${app.jobId}/applications`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {job?.title || 'Unknown Role'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {app.candidateEmail} • Applied{' '}
                {app.appliedAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            {app.matchScore !== undefined && app.matchScore !== null && (
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(app.matchScore)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Match Score
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-Width Timeline */}
        <ApplicationTimeline
          applicationId={app._id.toString()}
          jobId={app.jobId.toString()}
          viewAs="recruiter"
          applicationData={{
            candidateEmail: app.candidateEmail,
            matchScore: app.matchScore ?? undefined,
            scoreBreakdown: app.scoreBreakdown
              ? {
                  semanticSimilarity: app.scoreBreakdown.semanticSimilarity,
                  skillsAlignment: app.scoreBreakdown.skillsAlignment,
                  experienceLevel: app.scoreBreakdown.experienceLevel,
                  otherFactors: app.scoreBreakdown.otherFactors,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
