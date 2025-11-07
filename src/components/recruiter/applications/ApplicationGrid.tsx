'use client';

import { useState } from 'react';
import { ApplicationCard } from './ApplicationCard';
import { SkeletonList } from '@/components/ui/OptimisticLoader';
import type { Application } from '@/shared/types/application';

interface ApplicationGridProps {
  applications: Application[];
  isLoading?: boolean;
  onFeedback?: (_applicationId: string) => void;
  onSchedule?: (_applicationId: string) => void;
  onShare?: (_applicationId: string) => void;
  onView?: (_applicationId: string) => void;
}

/**
 * ApplicationGrid - Grid layout for applications with filters and pagination
 */
export function ApplicationGrid({
  applications,
  isLoading,
  onFeedback,
  onSchedule,
  onShare,
  onView,
}: ApplicationGridProps) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [minScoreFilter, setMinScoreFilter] = useState<number | null>(null);

  // Apply filters
  const filteredApplications = applications.filter(app => {
    if (statusFilter && app.status !== statusFilter) return false;
    if (minScoreFilter && (app.matchScore ?? 0) < minScoreFilter) return false;
    return true;
  });

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-600 mb-2">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          No applications yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Applications will appear here once candidates apply to this job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter || ''}
            onChange={e => setStatusFilter(e.target.value || null)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="score-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Min Score
          </label>
          <select
            id="score-filter"
            value={minScoreFilter || ''}
            onChange={e =>
              setMinScoreFilter(e.target.value ? Number(e.target.value) : null)
            }
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Any Score</option>
            <option value="90">90% or higher</option>
            <option value="80">80% or higher</option>
            <option value="70">70% or higher</option>
            <option value="60">60% or higher</option>
          </select>
        </div>
        {(statusFilter || minScoreFilter) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter(null);
              setMinScoreFilter(null);
            }}
            className="self-end text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredApplications.length} of {applications.length}{' '}
        applications
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No applications match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map(application => (
            <ApplicationCard
              key={application._id}
              application={application}
              onFeedback={onFeedback}
              onSchedule={onSchedule}
              onShare={onShare}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
