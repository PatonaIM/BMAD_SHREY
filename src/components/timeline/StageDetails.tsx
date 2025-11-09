/**
 * StageDetails Component
 *
 * Renders stage-specific details based on stage type.
 * Handles different data structures for each stage type.
 *
 * @module StageDetails
 */

import React from 'react';
import Link from 'next/link';
import type { ApplicationStage } from '@/shared/types/applicationStage';
import { AIInterviewCTA } from '@/components/AIInterviewCTA';
import { CandidateScheduling } from '@/components/candidate/scheduling';

interface StageDetailsProps {
  /** Stage data to display */
  stage: ApplicationStage;

  /** Additional application data for context */
  applicationData?: {
    candidateEmail?: string;
    matchScore?: number;
    scoreBreakdown?: {
      semanticSimilarity?: number;
      skillsAlignment?: number;
      experienceLevel?: number;
      otherFactors?: number;
    };
  };

  /** Application ID for actions (like starting interview) */
  applicationId?: string;

  /** Job ID for AI interview */
  jobId?: string;

  /** Current viewing role */
  viewAs?: 'candidate' | 'recruiter';

  /** Interview session data (for completed AI interviews) */
  interviewSession?: {
    videoRecordingUrl?: string;
    questions?: Array<{
      id: string;
      text: string;
      type: string;
    }>;
    duration?: number;
    qaTranscript?: Array<{
      question: string;
      answer: string;
      timestamp: number;
    }>;
    interviewSummary?: {
      strengths?: string[];
      weaknesses?: string[];
      overallAssessment?: string;
    };
  };
}

/**
 * Renders stage-specific details
 */
export function StageDetails({
  stage,
  applicationData,
  applicationId,
  jobId,
  viewAs,
  interviewSession,
}: StageDetailsProps): JSX.Element {
  // Render based on stage type
  switch (stage.type) {
    case 'submit_application':
      return (
        <SubmitApplicationDetails
          stage={stage}
          applicationData={applicationData}
        />
      );

    case 'ai_interview':
      return (
        <AIInterviewDetails
          stage={stage}
          applicationId={applicationId}
          jobId={jobId}
          matchScore={applicationData?.matchScore}
          viewAs={viewAs}
          interviewSession={interviewSession}
        />
      );

    case 'under_review':
      return <UnderReviewDetails stage={stage} />;

    case 'assignment':
      return <AssignmentDetails stage={stage} />;

    case 'live_interview':
      return <LiveInterviewDetails stage={stage} />;

    case 'offer':
      return <OfferDetails stage={stage} />;

    case 'offer_accepted':
      return <OfferAcceptedDetails stage={stage} />;

    case 'disqualified':
      return <DisqualifiedDetails stage={stage} />;

    default:
      return <DefaultDetails stage={stage} />;
  }
}

/**
 * Submit Application Details
 */
function SubmitApplicationDetails({
  stage,
  applicationData,
}: {
  stage: ApplicationStage;
  applicationData?: StageDetailsProps['applicationData'];
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'submit_application';
    submittedAt?: Date | string;
    resumeUrl?: string;
    coverLetter?: string;
    [key: string]: unknown;
  };

  return (
    <div className="space-y-4">
      {/* Candidate Information */}
      {applicationData?.candidateEmail && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-brand-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Candidate Details
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email:</dt>
              <dd className="font-medium text-foreground">
                {applicationData.candidateEmail}
              </dd>
            </div>
            {data.submittedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Submitted:</dt>
                <dd className="font-medium text-foreground">
                  {new Date(data.submittedAt as string).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Resume Information */}
      {data.resumeUrl && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-brand-primary"
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
          </h4>
          <Link
            href={data.resumeUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View Resume
          </Link>
        </div>
      )}

      {/* Match Score */}
      {applicationData?.matchScore !== undefined &&
        applicationData.matchScore !== null && (
          <div className="bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 rounded-lg border border-brand-primary/20 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Match Score
            </h4>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-brand-primary">
                {Math.round(applicationData.matchScore)}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
                    style={{ width: `${applicationData.matchScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            {applicationData.scoreBreakdown && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {applicationData.scoreBreakdown.semanticSimilarity !==
                  undefined && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Semantic Match:
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {Math.round(
                        applicationData.scoreBreakdown.semanticSimilarity
                      )}
                      %
                    </span>
                  </div>
                )}
                {applicationData.scoreBreakdown.skillsAlignment !== undefined &&
                  applicationData.scoreBreakdown.skillsAlignment > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Skills:
                      </span>
                      <span className="font-semibold text-sm text-foreground">
                        {Math.round(
                          applicationData.scoreBreakdown.skillsAlignment
                        )}
                        %
                      </span>
                    </div>
                  )}
                {applicationData.scoreBreakdown.experienceLevel !== undefined &&
                  applicationData.scoreBreakdown.experienceLevel > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Experience:
                      </span>
                      <span className="font-semibold text-sm text-foreground">
                        {Math.round(
                          applicationData.scoreBreakdown.experienceLevel
                        )}
                        %
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

      {/* Cover Letter (if provided in data) */}
      {data.coverLetter && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Cover Letter
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
            {data.coverLetter as string}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * AI Interview Details
 */
function AIInterviewDetails({
  stage,
  applicationId,
  jobId,
  matchScore,
  viewAs,
  interviewSession,
}: {
  stage: ApplicationStage;
  applicationId?: string;
  jobId?: string;
  matchScore?: number;
  viewAs?: 'candidate' | 'recruiter';
  interviewSession?: StageDetailsProps['interviewSession'];
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'ai_interview';
    interviewSessionId?: string;
    interviewScore?: number;
    interviewCompletedAt?: Date | string;
    videoUrl?: string;
    detailedFeedback?: {
      strengths?: string[];
      improvements?: string[];
      summary?: string;
    };
    schedulingInfo?: {
      hasScheduledCall: boolean;
      scheduledAt?: Date | string;
      recruiterName?: string;
      recruiterEmail?: string;
      meetLink?: string;
      duration?: number;
      status?: string;
    };
    [key: string]: unknown;
  };

  const isCompleted = stage.status === 'completed' || data.interviewCompletedAt;
  const isPending =
    stage.status === 'pending' || stage.status === 'awaiting_candidate';
  const isCandidate = viewAs === 'candidate';

  // Use feedback from stage data if interviewSession not provided
  const feedback =
    interviewSession?.interviewSummary || data.detailedFeedback
      ? {
          strengths:
            interviewSession?.interviewSummary?.strengths ||
            data.detailedFeedback?.strengths ||
            [],
          weaknesses:
            interviewSession?.interviewSummary?.weaknesses ||
            data.detailedFeedback?.improvements ||
            [],
          overallAssessment:
            interviewSession?.interviewSummary?.overallAssessment ||
            data.detailedFeedback?.summary ||
            '',
        }
      : undefined;

  // Show CTA for candidate when pending
  if (isPending && isCandidate && applicationId && jobId && matchScore) {
    return (
      <div className="space-y-4">
        <AIInterviewCTA
          applicationId={applicationId}
          jobId={jobId}
          matchScore={matchScore}
          interviewStatus="not_started"
          useV2Route={true}
        />
      </div>
    );
  }

  // Show interview results when completed
  if (isCompleted) {
    return (
      <div className="space-y-4">
        {/* Schedule Call Section (for candidate after completed interview) - MOVED TO TOP */}
        {isCandidate && applicationId && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-brand-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Schedule Follow-up Call
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Great job completing the AI interview! Schedule a follow-up call
              with the hiring team to discuss next steps.
            </p>
            <CandidateScheduling applicationId={applicationId} />
          </div>
        )}

        {/* Interview Score Card */}
        {data.interviewScore !== undefined && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Interview Results
            </h4>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {data.interviewScore}/100
              </div>
              <div className="flex-1">
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-purple-600 to-indigo-600 transition-all"
                    style={{ width: `${data.interviewScore}%` }}
                  />
                </div>
              </div>
            </div>
            {data.interviewCompletedAt && (
              <p className="text-xs text-muted-foreground">
                Completed:{' '}
                {new Date(data.interviewCompletedAt as string).toLocaleString()}
              </p>
            )}

            {/* Interview Feedback/Summary */}
            {feedback && (
              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                {feedback.overallAssessment && (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-foreground mb-1">
                      Overall Assessment:
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {feedback.overallAssessment}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
                        Strengths:
                      </h5>
                      <ul className="space-y-1">
                        {feedback.strengths.map((strength, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-muted-foreground flex items-start gap-1"
                          >
                            <span className="text-green-600 dark:text-green-400 mt-0.5">
                              •
                            </span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                        Areas for Improvement:
                      </h5>
                      <ul className="space-y-1">
                        {feedback.weaknesses.map((weakness, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-muted-foreground flex items-start gap-1"
                          >
                            <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                              •
                            </span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Recording */}
        {(interviewSession?.videoRecordingUrl ||
          (data as { videoUrl?: string }).videoUrl) && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Interview Recording
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {isCandidate
                ? 'Review your interview performance and responses.'
                : "View the candidate's interview recording and responses."}
            </p>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                controls
                className="w-full"
                preload="metadata"
                controlsList="nodownload"
              >
                <source
                  src={
                    interviewSession?.videoRecordingUrl ||
                    (data as { videoUrl?: string }).videoUrl
                  }
                  type="video/webm"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Scheduling Info for Recruiters */}
        {!isCandidate &&
          (() => {
            const schedulingInfo = data.schedulingInfo;
            return (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Scheduling Status
                </h4>
                {schedulingInfo?.hasScheduledCall ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Candidate has scheduled a follow-up call
                      </span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-3 space-y-2 text-sm">
                      {schedulingInfo.scheduledAt && (
                        <div>
                          <span className="text-muted-foreground">
                            Scheduled for:
                          </span>{' '}
                          <span className="font-medium text-foreground">
                            {new Date(
                              schedulingInfo.scheduledAt as string
                            ).toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      {schedulingInfo.duration && (
                        <div>
                          <span className="text-muted-foreground">
                            Duration:
                          </span>{' '}
                          <span className="font-medium text-foreground">
                            {schedulingInfo.duration} minutes
                          </span>
                        </div>
                      )}
                      {schedulingInfo.recruiterName && (
                        <div>
                          <span className="text-muted-foreground">With:</span>{' '}
                          <span className="font-medium text-foreground">
                            {schedulingInfo.recruiterName}
                            {schedulingInfo.recruiterEmail && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({schedulingInfo.recruiterEmail})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {schedulingInfo.status && (
                        <div>
                          <span className="text-muted-foreground">Status:</span>{' '}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              schedulingInfo.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : schedulingInfo.status === 'completed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}
                          >
                            {schedulingInfo.status
                              .replace('_', ' ')
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      {schedulingInfo.meetLink && (
                        <div className="pt-2">
                          <a
                            href={schedulingInfo.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                        No follow-up call scheduled yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        The candidate hasn&apos;t booked a follow-up call.
                        Consider reaching out to schedule one.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Session Info */}
        {data.interviewSessionId && !isCandidate && (
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Session ID:</span>{' '}
            <span className="font-medium font-mono text-xs">
              {data.interviewSessionId as string}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Fallback for in-progress or other states
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="font-medium">Interview in Progress</span>
      </div>
      {data.interviewSessionId && (
        <div>
          <span className="text-muted-foreground">Session ID:</span>{' '}
          <span className="font-medium font-mono text-xs">
            {data.interviewSessionId as string}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Under Review Details
 */
function UnderReviewDetails({
  stage,
}: {
  stage: ApplicationStage;
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'under_review';
    reviewerId?: string;
    reviewNotes?: string;
    [key: string]: unknown;
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm space-y-2">
      {data.reviewerId && (
        <div>
          <span className="text-muted-foreground">Reviewer:</span>{' '}
          <span className="font-medium">{data.reviewerId as string}</span>
        </div>
      )}
      {data.reviewNotes && (
        <div>
          <span className="text-muted-foreground">Notes:</span>{' '}
          <p className="mt-1 text-muted-foreground">
            {data.reviewNotes as string}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Assignment Details
 */
function AssignmentDetails({
  stage,
}: {
  stage: ApplicationStage;
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'assignment';
    assignmentTitle?: string;
    assignmentUrl?: string;
    submittedAt?: Date | string;
    [key: string]: unknown;
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm space-y-2">
      {data.assignmentTitle && (
        <div>
          <span className="font-medium">{data.assignmentTitle as string}</span>
        </div>
      )}
      {data.assignmentUrl && (
        <div>
          <Link
            href={data.assignmentUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline"
          >
            View Assignment →
          </Link>
        </div>
      )}
      {data.submittedAt && (
        <div>
          <span className="text-muted-foreground">Submitted:</span>{' '}
          <span className="font-medium">
            {new Date(data.submittedAt as string).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Live Interview Details
 */
function LiveInterviewDetails({
  stage,
}: {
  stage: ApplicationStage;
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'live_interview';
    scheduledTime?: Date | string;
    scheduledAt?: Date | string;
    meetLink?: string;
    meetingLink?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    interviewerName?: string;
    durationMinutes?: number;
    title?: string;
    [key: string]: unknown;
  };

  const scheduledDate = data.scheduledTime || data.scheduledAt;
  const meetingUrl = data.meetLink || data.meetingLink;
  const recruiterDisplayName = data.recruiterName || data.interviewerName;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 space-y-3">
      {data.title && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground mb-1">
            Interview Type:
          </h5>
          <p className="text-sm font-medium text-foreground">
            {data.title as string}
          </p>
        </div>
      )}
      {scheduledDate && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground mb-1">
            Scheduled:
          </h5>
          <p className="text-sm font-medium text-foreground">
            {new Date(scheduledDate as string).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
      {data.durationMinutes && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground mb-1">
            Duration:
          </h5>
          <p className="text-sm font-medium text-foreground">
            {data.durationMinutes} minutes
          </p>
        </div>
      )}
      {recruiterDisplayName && (
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground mb-1">
            Interviewer:
          </h5>
          <p className="text-sm font-medium text-foreground">
            {recruiterDisplayName as string}
            {data.recruiterEmail && (
              <span className="text-xs text-muted-foreground ml-2">
                ({data.recruiterEmail as string})
              </span>
            )}
          </p>
        </div>
      )}
      {meetingUrl && (
        <div className="pt-2">
          <Link
            href={meetingUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Join Meeting
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Offer Details
 */
function OfferDetails({ stage }: { stage: ApplicationStage }): JSX.Element {
  const data = stage.data as unknown as {
    type: 'offer';
    salary?: string;
    startDate?: Date | string;
    expiresAt?: Date | string;
    [key: string]: unknown;
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 text-sm space-y-2">
      {data.salary && (
        <div>
          <span className="text-muted-foreground">Salary:</span>{' '}
          <span className="font-semibold text-green-700 dark:text-green-400">
            {data.salary as string}
          </span>
        </div>
      )}
      {data.startDate && (
        <div>
          <span className="text-muted-foreground">Start Date:</span>{' '}
          <span className="font-medium">
            {new Date(data.startDate as string).toLocaleDateString()}
          </span>
        </div>
      )}
      {data.expiresAt && (
        <div>
          <span className="text-muted-foreground">Expires:</span>{' '}
          <span className="font-medium">
            {new Date(data.expiresAt as string).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Offer Accepted Details
 */
function OfferAcceptedDetails({
  stage,
}: {
  stage: ApplicationStage;
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'offer_accepted';
    acceptedAt?: Date | string;
    [key: string]: unknown;
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 text-sm">
      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Congratulations! Offer Accepted
      </div>
      {data.acceptedAt && (
        <div className="mt-2">
          <span className="text-muted-foreground">Accepted on:</span>{' '}
          <span className="font-medium">
            {new Date(data.acceptedAt as string).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Disqualified Details
 */
function DisqualifiedDetails({
  stage,
}: {
  stage: ApplicationStage;
}): JSX.Element {
  const data = stage.data as unknown as {
    type: 'disqualified';
    reason?: string;
    disqualifiedAt?: Date | string;
    [key: string]: unknown;
  };

  return (
    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 text-sm space-y-2">
      {data.reason && (
        <div>
          <span className="text-muted-foreground">Reason:</span>{' '}
          <p className="mt-1 text-foreground">{data.reason as string}</p>
        </div>
      )}
      {data.disqualifiedAt && (
        <div>
          <span className="text-muted-foreground">Date:</span>{' '}
          <span className="font-medium">
            {new Date(data.disqualifiedAt as string).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Default Details (fallback)
 */
function DefaultDetails({ stage }: { stage: ApplicationStage }): JSX.Element {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm">
      <pre className="text-xs text-muted-foreground overflow-x-auto">
        {JSON.stringify(stage.data, null, 2)}
      </pre>
    </div>
  );
}
