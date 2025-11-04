'use client';

import React from 'react';
import Link from 'next/link';

interface TopMatch {
  _id: string;
  jobTitle: string;
  jobCompany: string;
  matchScore: number;
  appliedAt: Date;
  status: string;
  interviewStatus?: 'not_started' | 'in_progress' | 'completed';
}

interface QuickPicksWidgetProps {
  topMatches: TopMatch[];
  loading?: boolean;
}

export const QuickPicksWidget: React.FC<QuickPicksWidgetProps> = ({
  topMatches,
  loading = false,
}) => {
  // Color coding based on match score
  const getScoreColor = (score: number) => {
    if (score >= 85) {
      return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 ring-green-600/20';
    }
    if (score >= 70) {
      return 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 ring-blue-600/20';
    }
    if (score >= 60) {
      return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20';
    }
    return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 ring-orange-600/20';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 85) return '⭐';
    if (score >= 70) return '🚀';
    if (score >= 60) return '💡';
    return '📈';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your Top Matches</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Loading...
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-800/50"
            >
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (topMatches.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your Top Matches</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Apply to jobs to see your best matches
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            No applications yet. Start applying to discover your top matches!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 btn-primary px-4 py-2 text-sm"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your Top Matches</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {topMatches.length} high-scoring{' '}
              {topMatches.length === 1 ? 'application' : 'applications'}
            </p>
          </div>
        </div>
        <Link
          href="/applications"
          className="text-xs text-brand-primary hover:text-brand-secondary transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {topMatches.map((match, index) => (
          <div
            key={match._id}
            className="group rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-800/50 hover:border-brand-primary/50 dark:hover:border-brand-primary/50 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {getScoreEmoji(match.matchScore)}
                  </span>
                  <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    {match.jobTitle}
                  </h3>
                  {index === 0 && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-600/20">
                      #1 Match
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  {match.jobCompany} • Applied {formatDate(match.appliedAt)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getScoreColor(match.matchScore)}`}
                  >
                    {match.matchScore}% Match
                  </span>
                  {match.interviewStatus === 'completed' && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 ring-purple-600/20">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Interview Done
                    </span>
                  )}
                  {match.interviewStatus === 'not_started' &&
                    match.matchScore >= 50 &&
                    match.matchScore < 90 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 ring-blue-600/20">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Can Boost Score
                      </span>
                    )}
                </div>
              </div>
              <Link
                href={`/applications/${match._id}`}
                className="shrink-0 btn-outline px-3 py-1.5 text-xs group-hover:btn-primary transition-all"
              >
                View
              </Link>
            </div>

            {/* Boost CTA for eligible applications */}
            {match.interviewStatus === 'not_started' &&
              match.matchScore >= 50 &&
              match.matchScore < 90 && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <Link
                    href={`/applications/${match._id}#interview`}
                    className="flex items-center justify-between gap-2 text-xs text-brand-primary hover:text-brand-secondary transition-colors group/boost"
                  >
                    <span className="flex items-center gap-2">
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
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      <span className="font-medium">
                        Take AI Interview to boost by up to 15 points
                      </span>
                    </span>
                    <svg
                      className="w-4 h-4 transition-transform group-hover/boost:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              )}
          </div>
        ))}
      </div>

      {topMatches.length >= 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/applications"
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-brand-primary transition-colors"
          >
            View all applications →
          </Link>
        </div>
      )}
    </div>
  );
};
