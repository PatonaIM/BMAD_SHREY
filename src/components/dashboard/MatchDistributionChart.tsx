'use client';

import Link from 'next/link';

interface MatchDistribution {
  excellent: number; // 85-100%
  good: number; // 65-84%
  fair: number; // 40-64%
  poor: number; // 0-39%
}

interface MatchDistributionChartProps {
  distribution: MatchDistribution;
  totalJobs: number;
  isLoading?: boolean;
}

export function MatchDistributionChart({
  distribution,
  totalJobs,
  isLoading = false,
}: MatchDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-12 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (totalJobs === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Job Match Distribution
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No jobs available yet. Check back soon for new opportunities!
        </p>
      </div>
    );
  }

  const categories = [
    {
      label: 'Excellent Match',
      count: distribution.excellent,
      color: 'bg-green-500 dark:bg-green-600',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      range: '85-100%',
    },
    {
      label: 'Good Match',
      count: distribution.good,
      color: 'bg-blue-500 dark:bg-blue-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      range: '65-84%',
    },
    {
      label: 'Fair Match',
      count: distribution.fair,
      color: 'bg-yellow-500 dark:bg-yellow-600',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      range: '40-64%',
    },
    {
      label: 'Needs Improvement',
      count: distribution.poor,
      color: 'bg-red-500 dark:bg-red-600',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      range: '0-39%',
    },
  ];

  const getPercentage = (count: number) => {
    return totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
  };

  const bestFitCount = distribution.excellent + distribution.good;
  const bestFitPercentage = getPercentage(bestFitCount);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Job Match Distribution
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            How you compare across {totalJobs} available{' '}
            {totalJobs === 1 ? 'job' : 'jobs'}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 p-4 rounded-lg bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Best fit for you
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-primary">
              {bestFitCount}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {bestFitPercentage}% of jobs
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3 mb-6">
        {categories.map(category => {
          const percentage = getPercentage(category.count);
          return (
            <div key={category.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {category.label}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({category.range})
                  </span>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {category.count}
                </span>
              </div>
              <div className="relative w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${category.color} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${category.label} percentage`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
        {bestFitPercentage >= 30 ? (
          <div className="flex items-start gap-3 mb-4">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
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
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Great profile match!
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                You're a strong fit for {bestFitPercentage}% of available jobs
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 mb-4">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Improve your matches
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Complete your profile to match with more jobs
              </p>
            </div>
          </div>
        )}
        <Link
          href="/?sort=best-match"
          className="btn-outline w-full justify-center px-4 py-2 text-sm"
        >
          Browse All Jobs
        </Link>
      </div>
    </div>
  );
}
