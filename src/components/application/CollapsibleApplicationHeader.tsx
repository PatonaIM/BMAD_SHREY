'use client';

import React from 'react';
import Link from 'next/link';

interface CollapsibleApplicationHeaderProps {
  backHref: string;
  backLabel: string;
  jobTitle: string;
  status: string;
  statusColors?: {
    bg: string;
    text: string;
    border: string;
  };
  matchScore?: number;
  rightContent?: React.ReactNode;
}

export function CollapsibleApplicationHeader({
  backHref,
  backLabel,
  jobTitle,
  status,
  statusColors,
  matchScore,
  rightContent,
}: CollapsibleApplicationHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        {/* Compact Header - Single Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back + Title + Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Back Button */}
            <Link
              href={backHref}
              className="flex-shrink-0 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              title={backLabel}
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>

            {/* Title + Match Score */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">
                {jobTitle}
              </h1>

              {matchScore !== undefined && matchScore !== null && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-primary whitespace-nowrap">
                      {Math.round(matchScore)}%
                    </span>
                    <div className="hidden sm:block w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                        style={{ width: `${matchScore}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Status Badge or Actions */}
          <div className="flex-shrink-0">
            {status && !rightContent && statusColors && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusColors.bg
                } ${statusColors.text} ${statusColors.border}`}
              >
                {status.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
