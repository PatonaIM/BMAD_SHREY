import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
// import { getResume } from '../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../data-access/repositories/interviewSessionRepo';
import { resumeVectorRepo } from '../../../data-access/repositories/resumeVectorRepo';
import { getMongoClient } from '../../../data-access/mongoClient';
import { logger } from '../../../monitoring/logger';
import Link from 'next/link';
// import { InterviewLauncher } from '../../../components/interview/InterviewLauncher';
import { InterviewPlayer } from '../../../components/interview/InterviewPlayer';
// import { ScoreComparisonCard } from '../../../components/application/ScoreComparisonCard';
// import { InterviewCompletionBadge } from '../../../components/application/InterviewCompletionBadge';
// import { AIInterviewCTA } from '../../../components/AIInterviewCTA';
// import { InterviewStatusCard } from '../../../components/InterviewStatusCard';
// import { CandidateScheduling } from '../../../components/candidate/scheduling';
import { ApplicationTimeline } from '../../../components/timeline';
// import { getEnv } from '../../../config/env';

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

  // Get user ID for fetching profile
  let userId: string = app.userId;
  if (userSession.id) {
    userId = userSession.id;
  } else {
    const user = await findUserByEmail(userSession.email);
    if (user) {
      userId = user._id;
    }
  }

  // Calculate match score if not available
  let matchScore = app.matchScore;
  let scoreBreakdown = app.scoreBreakdown;

  if (!matchScore || !scoreBreakdown) {
    // Use vector-based matching (same as AI recommendations)
    try {
      const resumeVectors = await resumeVectorRepo.getByUserId(userId);

      if (resumeVectors && resumeVectors.length > 0 && job) {
        // Use the most recent resume vector
        const candidateVector = resumeVectors.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];

        if (
          candidateVector?.embeddings &&
          Array.isArray(candidateVector.embeddings) &&
          candidateVector.embeddings.length > 0
        ) {
          // Get job vector and calculate similarity
          const client = await getMongoClient();
          const db = client.db();
          const jobVectors = db.collection('jobVectors');

          const pipeline = [
            {
              $vectorSearch: {
                index: 'job_vector_index',
                path: 'embedding',
                queryVector: candidateVector.embeddings,
                numCandidates: 100,
                limit: 50, // Get more results to filter
              },
            },
            {
              $addFields: {
                vectorScore: { $meta: 'vectorSearchScore' },
              },
            },
            // Filter for our specific job after vector search
            {
              $match: {
                jobId: app.jobId.toString(),
              },
            },
            {
              $limit: 1,
            },
          ];

          const results = (await jobVectors.aggregate(pipeline).toArray()) as {
            vectorScore?: number;
          }[];

          if (results?.[0]?.vectorScore) {
            const vectorScore = results[0].vectorScore;
            matchScore = Math.round(vectorScore * 1000) / 10; // Convert to percentage with 1 decimal
            scoreBreakdown = {
              semanticSimilarity: matchScore,
              skillsAlignment: 0, // Not calculated separately in vector matching
              experienceLevel: 0,
              otherFactors: 0,
            };

            // Update application with calculated score
            try {
              await applicationRepo.updateMatchScore(
                app._id.toString(),
                matchScore,
                scoreBreakdown
              );
            } catch (error) {
              logger.error('Failed to update application with match score', {
                error,
                applicationId: app._id.toString(),
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to calculate vector-based match score', {
        error,
        applicationId: app._id.toString(),
      });
    }
  }

  // Fetch resume details if resumeVersionId exists
  // let resumeInfo = null;
  if (app.resumeVersionId) {
    // For OAuth users, we need to get their actual user ID, not from the application
    // let userId: string = app.userId; // Default to app.userId
    // If the user has an ID in session (OAuth), use that instead
    if (userSession.id) {
      // userId = userSession.id;
    } else {
      // For credential users, look up by email to get the correct user ID
      const user = await findUserByEmail(userSession.email);
      if (user) {
        // userId = user._id;
      }
    }

    // const resumeDoc = await getResume(userId);
    // if (resumeDoc) {
    //   resumeInfo = resumeDoc.versions.find(
    //     v => v.versionId === app.resumeVersionId
    //   );
    // }
  }

  // Fetch interview session if exists
  let interviewSession = null;
  if (app.interviewSessionId) {
    interviewSession = await interviewSessionRepo.findBySessionId(
      app.interviewSessionId
    );
  }

  // Feature flag for new interview page (v2)
  // const env = getEnv();
  // const interviewV2Enabled = env.ENABLE_INTERVIEW_V2_PAGE;

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
        {matchScore !== undefined && matchScore !== null && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Match Score</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-brand-primary">
                {matchScore}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
              </div>
            </div>
            {scoreBreakdown && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {scoreBreakdown.semanticSimilarity !== undefined && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      AI Match Score (Vector Similarity):
                    </span>{' '}
                    <span className="font-medium">
                      {scoreBreakdown.semanticSimilarity}%
                    </span>
                  </div>
                )}
                {scoreBreakdown.skillsAlignment !== undefined &&
                  scoreBreakdown.skillsAlignment > 0 && (
                    <div>
                      <span className="text-muted-foreground">Skills:</span>{' '}
                      <span className="font-medium">
                        {scoreBreakdown.skillsAlignment}%
                      </span>
                    </div>
                  )}
                {scoreBreakdown.experienceLevel !== undefined &&
                  scoreBreakdown.experienceLevel > 0 && (
                    <div>
                      <span className="text-muted-foreground">Experience:</span>{' '}
                      <span className="font-medium">
                        {scoreBreakdown.experienceLevel}%
                      </span>
                    </div>
                  )}
                {scoreBreakdown.otherFactors !== undefined &&
                  scoreBreakdown.otherFactors > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        Other Factors:
                      </span>{' '}
                      <span className="font-medium">
                        {scoreBreakdown.otherFactors}%
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Interview CTA/Status Section (EP3-S10) */}
      {/* <AIInterviewCTA
        applicationId={app._id.toString()}
        jobId={app.jobId.toString()}
        matchScore={matchScore || 0}
        interviewStatus={app.interviewStatus}
        className="mb-6"
        useV2Route={interviewV2Enabled}
      /> */}

      {/* Interview Recording Player */}
      {app.interviewStatus === 'completed' &&
        interviewSession?.videoRecordingUrl && (
          <div className="mb-6">
            <InterviewPlayer
              videoUrl={interviewSession.videoRecordingUrl}
              questions={interviewSession.questions || []}
              duration={(interviewSession.duration || 0) * 1000}
              qaTranscript={interviewSession.qaTranscript}
              interviewSummary={interviewSession.interviewSummary}
              className="w-full"
            />
          </div>
        )}

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
      </div> */}

      {/* Timeline Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">Application Timeline</h3>
        <ApplicationTimeline
          applicationId={app._id.toString()}
          jobId={app.jobId}
          viewAs="candidate"
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

      {/* Candidate Self-Scheduling Section */}
      {/* {app.interviewStatus === 'completed' && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Schedule Follow-up Call
          </h2>
          <CandidateScheduling applicationId={app._id.toString()} />
        </div>
      )} */}

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
