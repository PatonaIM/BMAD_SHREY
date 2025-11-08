import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '@/data-access/repositories/applicationRepo';
import { jobRepo } from '@/data-access/repositories/jobRepo';
import { getExtractedProfile } from '@/data-access/repositories/extractedProfileRepo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TimelineView } from '@/components/recruiter/timeline/TimelineView';

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ai_interview:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  under_review:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  interview_scheduled:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  offer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

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

  // Get candidate profile
  const profile = await getExtractedProfile(app.userId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/recruiter/jobs/${app.jobId}/applications`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Application Details
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Application Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job & Status Card */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                    {job?.title || 'Unknown Role'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {job?.company || 'Unknown Company'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Applied on{' '}
                    {app.appliedAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      statusColors[app.status] || statusColors.submitted
                    }`}
                  >
                    {app.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Match Score Section */}
              {app.matchScore !== undefined && app.matchScore !== null && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                    Match Score
                  </h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round(app.matchScore)}%
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all"
                          style={{ width: `${app.matchScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {app.scoreBreakdown && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {app.scoreBreakdown.semanticSimilarity !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Semantic Match:
                          </span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round(app.scoreBreakdown.semanticSimilarity)}%
                          </span>
                        </div>
                      )}
                      {app.scoreBreakdown.skillsAlignment !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Skills:
                          </span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round(app.scoreBreakdown.skillsAlignment)}%
                          </span>
                        </div>
                      )}
                      {app.scoreBreakdown.experienceLevel !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Experience:
                          </span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round(app.scoreBreakdown.experienceLevel)}%
                          </span>
                        </div>
                      )}
                      {app.scoreBreakdown.otherFactors !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Other Factors:
                          </span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round(app.scoreBreakdown.otherFactors)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Interview Status */}
              {app.interviewStatus && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                    AI Interview
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        app.interviewStatus === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : app.interviewStatus === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {app.interviewStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {app.interviewScore !== undefined && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Interview Score:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.round(app.interviewScore)}/100
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Card */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <TimelineView
                applicationId={app._id.toString()}
                timeline={app.timeline || []}
                isLoading={false}
              />
            </div>
          </div>

          {/* Right Column: Candidate Profile */}
          <div className="space-y-6">
            {/* Candidate Info Card */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">
                Candidate Information
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {app.candidateEmail}
                  </dd>
                </div>
                {profile?.summary && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400 mb-1">
                      Summary
                    </dt>
                    <dd className="text-gray-900 dark:text-white text-sm">
                      {profile.summary}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Resume Link */}
            {app.resumeVersionId && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                  Resume
                </h3>
                <Link
                  href={`/resume/${app.resumeVersionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                >
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
                  View Resume
                </Link>
              </div>
            )}

            {/* Skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.slice(0, 10).map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-300"
                    >
                      {typeof skill === 'string' ? skill : skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
