'use client';

import React from 'react';
import { trpc } from '../../../services/trpc/client';
import type { TabType, FilterState } from './RecruiterDashboard';
import { RecruiterJobCard } from './RecruiterJobCard';

interface RecruiterJobListProps {
  activeTab: TabType;
  filters: FilterState;
}

/**
 * Displays a list of jobs based on the active tab and filters
 */
export function RecruiterJobList({
  activeTab,
  filters,
}: RecruiterJobListProps): React.ReactElement {
  const [page, setPage] = React.useState(1);
  const [notification, setNotification] = React.useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const limit = 20;

  // Select the appropriate query based on active tab
  const openJobsQuery = trpc.recruiter.getAllJobs.useQuery(
    {
      ...filters,
      page,
      limit,
    },
    { enabled: activeTab === 'open' }
  );

  const closedJobsQuery = trpc.recruiter.getClosedJobs.useQuery(
    {
      ...filters,
      page,
      limit,
    },
    { enabled: activeTab === 'closed' }
  );

  // Subscribe to all jobs mutation
  const subscribeToAllMutation = trpc.recruiter.subscribeToAllJobs.useMutation({
    onSuccess: data => {
      // Refetch the job list to update subscription status
      openJobsQuery.refetch();
      setNotification({ message: data.message, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    },
    onError: error => {
      setNotification({
        message: `Failed to subscribe: ${error.message}`,
        type: 'error',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Get the appropriate query based on active tab
  const query = activeTab === 'open' ? openJobsQuery : closedJobsQuery;

  const { data, isLoading, isError, error } = query;

  // Sort open jobs to show subscribed jobs first
  const sortedJobs = React.useMemo(() => {
    if (!data?.jobs || activeTab !== 'open') return data?.jobs || [];

    return [...data.jobs].sort((a, b) => {
      // Check if jobs have isSubscribed property
      const aSubscribed = 'isSubscribed' in a ? a.isSubscribed : false;
      const bSubscribed = 'isSubscribed' in b ? b.isSubscribed : false;

      // Subscribed jobs come first
      if (aSubscribed && !bSubscribed) return -1;
      if (!aSubscribed && bSubscribed) return 1;
      return 0;
    });
  }, [data?.jobs, activeTab]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Failed to load jobs
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  // Empty state
  if (!data || data.jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          No jobs found
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {activeTab === 'open'
            ? 'No jobs match your current filters.'
            : 'No closed jobs found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <div
          className={`rounded-md p-4 ${
            notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`text-sm ${
              notification.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}
          >
            {notification.message}
          </p>
        </div>
      )}

      {/* Subscribe to All Jobs Button - Only show in Open Jobs tab */}
      {activeTab === 'open' && sortedJobs.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => subscribeToAllMutation.mutate()}
            disabled={subscribeToAllMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {subscribeToAllMutation.isPending
              ? 'Subscribing...'
              : 'Subscribe to All Jobs'}
          </button>
        </div>
      )}

      {/* Job Cards */}
      {sortedJobs.map(job => (
        <RecruiterJobCard
          key={job._id.toString()}
          job={job}
          activeTab={activeTab}
        />
      ))}

      {/* Pagination */}
      {data.total > limit && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data.hasMore}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * limit, data.total)}
                </span>{' '}
                of <span className="font-medium">{data.total}</span> results
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasMore}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
