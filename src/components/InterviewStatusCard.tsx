'use client';

import React from 'react';
import Link from 'next/link';

interface InterviewStatusCardProps {
  interviewStatus: 'not_started' | 'in_progress' | 'completed';
  interviewSessionId?: string;
  interviewCompletedAt?: Date;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  interviewScore?: number;
  className?: string;
}

export const InterviewStatusCard: React.FC<InterviewStatusCardProps> = ({
  interviewStatus,
  interviewSessionId,
  interviewCompletedAt,
  scoreBeforeInterview,
  scoreAfterInterview,
  interviewScore,
  className = '',
}) => {
  const scoreBoosted =
    scoreBeforeInterview !== undefined && scoreAfterInterview !== undefined
      ? scoreAfterInterview - scoreBeforeInterview
      : 0;

  // Not started - don't show anything (AIInterviewCTA handles this)
  if (interviewStatus === 'not_started' || !interviewSessionId) {
    return null;
  }

  // In progress
  if (interviewStatus === 'in_progress') {
    return (
      <div
        className={`rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 text-blue-900 dark:text-blue-100">
              Interview In Progress
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              You started an AI interview for this application. Continue where
              you left off.
            </p>
            <Link
              href={`/interview/${interviewSessionId}`}
              className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Continue Interview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Completed
  return (
    <div
      id="interview"
      className={`rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Interview Completed
            </h3>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 ring-1 ring-green-600/20">
              ✓ Done
            </span>
          </div>

          {interviewCompletedAt && (
            <p className="text-xs text-green-700 dark:text-green-300 mb-4">
              Completed on {new Date(interviewCompletedAt).toLocaleDateString()}{' '}
              at {new Date(interviewCompletedAt).toLocaleTimeString()}
            </p>
          )}

          {/* Score Comparison */}
          {scoreBeforeInterview !== undefined &&
            scoreAfterInterview !== undefined && (
              <div className="mb-6 p-4 rounded-lg bg-white dark:bg-neutral-800/50 border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-medium mb-3 text-neutral-900 dark:text-neutral-100">
                  Your Score Improvement
                </h4>
                <div className="flex items-center gap-6">
                  {/* Before */}
                  <div className="flex-1">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                      Before Interview
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                        {scoreBeforeInterview}
                      </span>
                      <span className="text-sm text-neutral-500">%</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>

                  {/* After */}
                  <div className="flex-1">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                      After Interview
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {scoreAfterInterview}
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Boost badge */}
                  {scoreBoosted > 0 && (
                    <div className="shrink-0">
                      <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 px-3 py-2 text-center shadow-md">
                        <p className="text-xs text-white/90 mb-0.5">Boost</p>
                        <p className="text-lg font-bold text-white">
                          +{scoreBoosted.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Interview Score */}
          {interviewScore !== undefined && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-neutral-700 dark:text-neutral-300">
                Interview Performance:{' '}
                <strong className="text-green-600 dark:text-green-400">
                  {interviewScore}/100
                </strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/interview/${interviewSessionId}/results`}
              className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              View Full Results
            </Link>
            <Link
              href={`/interview/${interviewSessionId}/recording`}
              className="btn-outline px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Replay Interview
            </Link>
            <Link
              href={`/interview/${interviewSessionId}/transcript`}
              className="btn-outline px-4 py-2 text-sm inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Transcript
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
