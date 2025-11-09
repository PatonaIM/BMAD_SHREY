'use client';

import Link from 'next/link';
import type { CompletenessScore } from '../../shared/types/profileEditing';

interface ProfileCompletenessCardProps {
  score: CompletenessScore | null;
  hasResume: boolean;
}

export function ProfileCompletenessCard({
  score,
  hasResume,
}: ProfileCompletenessCardProps) {
  if (!score) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Profile Completeness
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Complete your profile to improve your match scores
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <svg
            className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-4">
            {hasResume
              ? 'Profile data is being processed'
              : 'Upload your resume to get started'}
          </p>
          <Link
            href={hasResume ? '/profile/edit' : '/profile/resume'}
            className="btn-primary px-4 py-2 text-sm"
          >
            {hasResume ? 'Edit Profile' : 'Upload Resume'}
          </Link>
        </div>
      </div>
    );
  }

  const getBandColor = (band: string) => {
    const colors = {
      poor: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
      fair: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
      good: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
      excellent:
        'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
    };
    return colors[band as keyof typeof colors] || colors.fair;
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500 dark:bg-green-600';
    if (score >= 65) return 'bg-yellow-500 dark:bg-yellow-600';
    if (score >= 40) return 'bg-orange-500 dark:bg-orange-600';
    return 'bg-red-500 dark:bg-red-600';
  };

  const formatSectionName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Profile Completeness
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Improve your profile to get better job matches
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${getBandColor(score.band)}`}
        >
          {score.band.toUpperCase()}
        </span>
      </div>

      {/* Score Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {score.score}%
          </span>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {score.score >= 85
              ? 'Excellent!'
              : score.score >= 65
                ? 'Good progress'
                : score.score >= 40
                  ? 'Keep going'
                  : 'Just getting started'}
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getBarColor(score.score)}`}
            style={{ width: `${score.score}%` }}
            role="progressbar"
            aria-valuenow={score.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness percentage"
          />
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="space-y-2 mb-6">
        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Section Breakdown:
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(score.breakdown).map(([section, sectionScore]) => {
            const percentage = Math.round(sectionScore * 100);
            return (
              <div
                key={section}
                className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/50"
              >
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {formatSectionName(section)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    percentage >= 70
                      ? 'text-green-600 dark:text-green-400'
                      : percentage >= 40
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {score.recommendations && score.recommendations.length > 0 && (
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Recommendations:
          </h4>
          <ul className="space-y-2">
            {score.recommendations.slice(0, 3).map((rec, idx) => (
              <li
                key={idx}
                className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start"
              >
                <span className="text-brand-primary mr-2 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          {score.recommendations.length > 3 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
              +{score.recommendations.length - 3} more suggestions
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/profile/edit"
          className="btn-primary flex-1 justify-center px-4 py-2 text-sm"
        >
          {score.score < 85 ? 'Complete Profile' : 'Edit Profile'}
        </Link>
        <Link
          href="/profile/recommendations"
          className="btn-outline flex-1 justify-center px-4 py-2 text-sm"
        >
          View Detailed Recommendations
        </Link>
      </div>
    </div>
  );
}
