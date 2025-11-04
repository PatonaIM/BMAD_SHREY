'use client';

import React from 'react';
import Link from 'next/link';

interface AIInterviewCTAProps {
  applicationId: string;
  matchScore: number;
  interviewStatus?: 'not_started' | 'in_progress' | 'completed';
  className?: string;
}

export const AIInterviewCTA: React.FC<AIInterviewCTAProps> = ({
  applicationId,
  matchScore,
  interviewStatus = 'not_started',
  className = '',
}) => {
  // Only show for scores between 50-89% and not yet completed
  const isEligible =
    matchScore >= 50 && matchScore < 90 && interviewStatus !== 'completed';

  if (!isEligible) {
    return null;
  }

  // Calculate potential boost (realistic range: 5-15 points)
  const minBoost = 5;
  const maxBoost = 15;
  const potentialScore = Math.min(matchScore + maxBoost, 100);

  return (
    <div
      id="interview"
      className={`rounded-xl border-2 border-brand-primary/30 bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 dark:from-brand-primary/10 dark:to-brand-secondary/10 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <span>Boost Your Application Score</span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 ring-1 ring-green-600/20">
              +{minBoost}-{maxBoost} points
            </span>
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Take a 15-minute AI-powered interview to demonstrate your skills and
            potentially boost your match score from{' '}
            <strong className="text-neutral-900 dark:text-neutral-100">
              {matchScore}%
            </strong>{' '}
            to{' '}
            <strong className="text-green-600 dark:text-green-400">
              up to {potentialScore}%
            </strong>
            .
          </p>

          {/* Benefits list */}
          <ul className="space-y-2 mb-6 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Quick & Convenient:</strong> Complete in 15 minutes,
                anytime
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Tailored Questions:</strong> Custom questions based on
                this job role
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Instant Results:</strong> Get feedback and score boost
                immediately
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Stand Out:</strong> Show initiative beyond your resume
              </span>
            </li>
          </ul>

          {/* CTA Button */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/interview/start?applicationId=${applicationId}`}
              className="btn-primary px-6 py-3 text-sm font-medium inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <svg
                className="w-5 h-5"
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
              Start AI Interview Now
            </Link>
            <button
              type="button"
              className="btn-outline px-6 py-3 text-sm font-medium"
              onClick={() => {
                // TODO: Open preparation guide modal
                alert('Interview preparation guide coming soon!');
              }}
            >
              Preparation Tips
            </button>
          </div>

          {/* Timeline hint */}
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Completing the interview typically takes 10-15 minutes
          </p>
        </div>
      </div>
    </div>
  );
};
