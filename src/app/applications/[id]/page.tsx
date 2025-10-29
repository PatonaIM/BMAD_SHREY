import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
import { getResume } from '../../../data-access/repositories/resumeRepo';
import Link from 'next/link';

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

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;
  if (!userSession?.email) redirect(`/login?redirect=/applications/${id}`);

  const app = await applicationRepo.findById(id);
  if (!app) return notFound();
  if (app.candidateEmail !== userSession.email) return notFound();
  const job = await jobRepo.findById(app.jobId);

  // Fetch resume details if resumeVersionId exists
  let resumeInfo = null;
  if (app.resumeVersionId) {
    const resumeDoc = await getResume(app.userId);
    if (resumeDoc) {
      resumeInfo = resumeDoc.versions.find(
        v => v.versionId === app.resumeVersionId
      );
    }
  }
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Application Details</h1>
      </div>

      {/* Job & Status Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">
              {job?.title || 'Unknown Role'}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {job?.company || 'Unknown Company'}
            </p>
            <p className="text-xs text-muted-foreground">
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
        {typeof app.matchScore === 'number' && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Match Score</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-brand-primary">
                {app.matchScore}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
                    style={{ width: `${app.matchScore}%` }}
                  />
                </div>
              </div>
            </div>
            {app.scoreBreakdown && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {app.scoreBreakdown.semanticSimilarity !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      Semantic Match:
                    </span>{' '}
                    <span className="font-medium">
                      {app.scoreBreakdown.semanticSimilarity}%
                    </span>
                  </div>
                )}
                {app.scoreBreakdown.skillsAlignment !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Skills:</span>{' '}
                    <span className="font-medium">
                      {app.scoreBreakdown.skillsAlignment}%
                    </span>
                  </div>
                )}
                {app.scoreBreakdown.experienceLevel !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Experience:</span>{' '}
                    <span className="font-medium">
                      {app.scoreBreakdown.experienceLevel}%
                    </span>
                  </div>
                )}
                {app.scoreBreakdown.otherFactors !== undefined && (
                  <div>
                    <span className="text-muted-foreground">
                      Other Factors:
                    </span>{' '}
                    <span className="font-medium">
                      {app.scoreBreakdown.otherFactors}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Resume Card */}
        {resumeInfo && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
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
              Resume
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">File:</span>{' '}
                <Link
                  href={`/resume/${resumeInfo.versionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-primary hover:underline"
                >
                  {resumeInfo.fileName}
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>{' '}
                <span className="font-medium">
                  {(resumeInfo.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Uploaded:</span>{' '}
                <span className="font-medium">
                  {new Date(resumeInfo.storedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>{' '}
                <span className="font-medium">
                  {resumeInfo.mimeType.split('/')[1]?.toUpperCase() ||
                    'UNKNOWN'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Link
                href={`/resume/${resumeInfo.versionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-2"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Resume
              </Link>
            </div>
          </div>
        )}

        {/* Cover Letter Card */}
        {app.coverLetter && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Cover Letter
            </h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
              {app.coverLetter}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm mb-6">
        <h3 className="text-sm font-semibold mb-4">Application Timeline</h3>
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
          <ul className="space-y-4">
            {app.timeline.map((event, i) => (
              <li key={i} className="relative pl-8">
                <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white dark:bg-neutral-900 border-2 border-brand-primary" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        statusColors[event.status] || statusColors.submitted
                      }`}
                    >
                      {event.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {event.actorType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.timestamp.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  {event.note && (
                    <p className="text-sm mt-1 text-foreground">{event.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Job Description Card */}
      {job?.description && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Job Description</h3>
            <Link
              href={`/jobs/${job.workableId || job._id}`}
              className="text-xs text-brand-primary hover:underline"
            >
              View Full Job →
            </Link>
          </div>
          <div
            className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: job.description.slice(0, 800),
            }}
          />
          {job.description.length > 800 && (
            <p className="text-xs text-muted-foreground mt-2">...</p>
          )}
        </div>
      )}
    </div>
  );
}
