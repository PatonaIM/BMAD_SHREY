'use client';

import React from 'react';
import Link from 'next/link';
import { trpc } from '../../services/trpc/client';

interface JobRecommendationsProps {
  limit?: number;
  minMatchScore?: number;
}

// Type for recommended job from API
interface RecommendedJob {
  _id: { toString(): string };
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  description?: string;
  requirements?: unknown;
  skills: string[];
  salary?: unknown;
  postedAt?: Date;
  matchScore: number;
  matchBreakdown: {
    vectorSimilarity: number;
  };
}

interface RecommendationsResponse {
  recommendations: RecommendedJob[];
  count: number;
  message?: string;
}

export const JobRecommendations: React.FC<JobRecommendationsProps> = ({
  limit = 10,
  minMatchScore,
}) => {
  const { data, isLoading, error } = trpc.candidate.getRecommendedJobs.useQuery(
    {
      limit,
      minMatchScore,
      includeApplied: false,
    }
  ) as {
    data: RecommendationsResponse | undefined;
    isLoading: boolean;
    error: { message: string } | null;
  };

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

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              AI-Powered Job Recommendations
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Finding your best matches...
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
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Unable to Load Recommendations
            </h2>
          </div>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 ml-11">
          {error.message || 'Something went wrong. Please try again later.'}
        </p>
      </div>
    );
  }

  // No resume / message state
  if (data?.message) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xl">📄</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              AI-Powered Job Recommendations
            </h2>
          </div>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 ml-11 mb-4">
          {data.message}
        </p>
        <Link
          href="/profile/resume"
          className="ml-11 inline-flex btn-primary px-4 py-2 text-sm"
        >
          Upload Resume
        </Link>
      </div>
    );
  }

  // Empty state (no recommendations)
  if (!data?.recommendations || data.recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              AI-Powered Job Recommendations
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              No matching jobs found at this time
            </p>
          </div>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Check back later as we add new opportunities, or{' '}
          <Link href="/" className="text-brand-primary hover:underline">
            browse all available jobs
          </Link>
          .
        </p>
      </div>
    );
  }

  // Success state with recommendations
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              AI-Powered Job Recommendations
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {data.count} personalized {data.count === 1 ? 'match' : 'matches'}{' '}
              based on your resume
            </p>
          </div>
        </div>
        <Link
          href="/jobs"
          className="text-xs text-brand-primary hover:underline hidden sm:block"
        >
          View All Jobs →
        </Link>
      </div>

      <div className="space-y-3">
        {data.recommendations.map(job => (
          <div
            key={job._id.toString()}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
                    {job.title}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getScoreColor(job.matchScore)}`}
                  >
                    {getScoreEmoji(job.matchScore)} {job.matchScore}% Match
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {job.company}
                  {job.location ? ` • ${job.location}` : ''}
                  {job.employmentType ? ` • ${job.employmentType}` : ''}
                </p>
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {job.skills.slice(0, 4).map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Link
                href={`/jobs/${job._id.toString()}`}
                className="btn-outline px-3 py-1.5 text-xs"
              >
                View Details
              </Link>
              <Link
                href={`/jobs/${job._id.toString()}/apply`}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                Apply Now
              </Link>
            </div>
          </div>
        ))}
      </div>

      {data.count > 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/jobs"
            className="text-sm text-brand-primary hover:underline inline-flex items-center gap-1"
          >
            View All {data.count} Recommendations
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};
