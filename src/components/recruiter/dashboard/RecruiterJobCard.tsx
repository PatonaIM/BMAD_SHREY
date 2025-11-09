'use client';

import React from 'react';
import Link from 'next/link';
import { trpc } from '../../../services/trpc/client';
import { cn } from '../../../utils/cn';
import type { TabType } from './RecruiterDashboard';
import type { Job } from '../../../shared/types/job';

interface RecruiterJobCardProps {
  job:
    | (Job & {
        applicationCount?: number;
        isSubscribed?: boolean;
        recruiterCount?: number;
      })
    | {
        _id: { toString(): string };
        jobId?: { toString(): string };
        title?: string;
        jobTitle?: string;
        company?: string;
        companyName?: string;
        location?: string;
        postedAt?: Date | string;
        applicationCount?: number;
        isSubscribed?: boolean;
        recruiterCount?: number;
      };
  activeTab: TabType;
}

/**
 * Individual job card with subscribe/unsubscribe functionality
 */
export function RecruiterJobCard({
  job,
  activeTab,
}: RecruiterJobCardProps): React.ReactElement {
  const utils = trpc.useUtils();

  const subscribeMutation = trpc.recruiter.subscribe.useMutation({
    onMutate: async ({ jobId }) => {
      // Cancel outgoing refetches
      await utils.recruiter.getActiveJobs.cancel();
      await utils.recruiter.getAllJobs.cancel();

      // Optimistically update the cache
      if (activeTab === 'open') {
        utils.recruiter.getAllJobs.setData(
          { keyword: '', location: '', sortBy: 'newest', page: 1, limit: 20 },
          old => {
            if (!old) return old;
            return {
              ...old,
              jobs: old.jobs.map(j =>
                j._id.toString() === jobId
                  ? {
                      ...j,
                      isSubscribed: true,
                      recruiterCount: (j.recruiterCount || 0) + 1,
                    }
                  : j
              ),
            };
          }
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      utils.recruiter.getActiveJobs.invalidate();
      utils.recruiter.getAllJobs.invalidate();
    },
    onError: (_err, { jobId }) => {
      // Rollback on error
      if (activeTab === 'open') {
        utils.recruiter.getAllJobs.setData(
          { keyword: '', location: '', sortBy: 'newest', page: 1, limit: 20 },
          old => {
            if (!old) return old;
            return {
              ...old,
              jobs: old.jobs.map(j =>
                j._id.toString() === jobId
                  ? {
                      ...j,
                      isSubscribed: false,
                      recruiterCount: Math.max(0, (j.recruiterCount || 0) - 1),
                    }
                  : j
              ),
            };
          }
        );
      }
    },
  });

  const unsubscribeMutation = trpc.recruiter.unsubscribe.useMutation({
    onMutate: async ({ jobId }) => {
      await utils.recruiter.getActiveJobs.cancel();
      await utils.recruiter.getAllJobs.cancel();

      // Optimistically update
      if (activeTab === 'open') {
        utils.recruiter.getAllJobs.setData(
          { keyword: '', location: '', sortBy: 'newest', page: 1, limit: 20 },
          old => {
            if (!old) return old;
            return {
              ...old,
              jobs: old.jobs.map(j =>
                j._id.toString() === jobId
                  ? {
                      ...j,
                      isSubscribed: false,
                      recruiterCount: Math.max(0, (j.recruiterCount || 0) - 1),
                    }
                  : j
              ),
            };
          }
        );
      }
    },
    onSuccess: () => {
      utils.recruiter.getActiveJobs.invalidate();
      utils.recruiter.getAllJobs.invalidate();
    },
    onError: (_err, { jobId }) => {
      if (activeTab === 'open') {
        utils.recruiter.getAllJobs.setData(
          { keyword: '', location: '', sortBy: 'newest', page: 1, limit: 20 },
          old => {
            if (!old) return old;
            return {
              ...old,
              jobs: old.jobs.map(j =>
                j._id.toString() === jobId
                  ? {
                      ...j,
                      isSubscribed: true,
                      recruiterCount: (j.recruiterCount || 0) + 1,
                    }
                  : j
              ),
            };
          }
        );
      }
    },
  });

  const handleSubscriptionToggle = () => {
    const jobId = typeof job._id === 'string' ? job._id : job._id.toString();
    if (job.isSubscribed) {
      unsubscribeMutation.mutate({ jobId });
    } else {
      subscribeMutation.mutate({ jobId, notificationsEnabled: true });
    }
  };

  const isLoading =
    subscribeMutation.isLoading || unsubscribeMutation.isLoading;

  const jobId =
    ('jobId' in job && job.jobId
      ? typeof job.jobId === 'string'
        ? job.jobId
        : job.jobId.toString()
      : undefined) ||
    (typeof job._id === 'string' ? job._id : job._id.toString());

  const jobTitle =
    ('jobTitle' in job && job.jobTitle) ||
    ('title' in job && job.title) ||
    'Untitled Position';

  const companyName =
    ('company' in job && job.company) ||
    ('companyName' in job && job.companyName) ||
    undefined;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            href={`/jobs/${jobId}`}
            className="group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {jobTitle}
            </h3>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
            {companyName && (
              <span className="flex items-center">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {companyName}
              </span>
            )}
            {job.location && (
              <span className="flex items-center">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {job.location}
              </span>
            )}
            {job.postedAt && (
              <span className="flex items-center">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Posted{' '}
                {new Date(
                  typeof job.postedAt === 'string' ? job.postedAt : job.postedAt
                ).toLocaleDateString()}
              </span>
            )}
            {typeof job.applicationCount === 'number' && (
              <span className="flex items-center">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {job.applicationCount} application
                {job.applicationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Subscription indicators for "All Jobs" tab */}
          {activeTab === 'open' && (
            <div className="mt-3 flex items-center gap-2">
              {job.isSubscribed && (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    Subscribed
                  </span>
                  {typeof job.applicationCount === 'number' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {job.applicationCount} application
                      {job.applicationCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
              {typeof job.recruiterCount === 'number' &&
                job.recruiterCount > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {job.recruiterCount} recruiter
                    {job.recruiterCount !== 1 ? 's' : ''} assigned
                  </span>
                )}
            </div>
          )}
        </div>

        {/* Action Buttons - View Applications if subscribed, Subscribe/Unsubscribe otherwise */}
        {activeTab === 'open' ? (
          job.isSubscribed ? (
            <div className="ml-4 flex gap-2">
              <Link
                href={`/recruiter/jobs/${jobId}/applications`}
                className={cn(
                  'inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium',
                  'text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                  'transition-colors duration-200'
                )}
              >
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
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
                View Applications
              </Link>
              <button
                onClick={handleSubscriptionToggle}
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                  'transition-colors duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                )}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Unsubscribe
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscriptionToggle}
              disabled={isLoading}
              className={cn(
                'ml-4 inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
              )}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Subscribe
                </>
              )}
            </button>
          )
        ) : activeTab !== 'closed' ? (
          <button
            onClick={handleSubscriptionToggle}
            disabled={isLoading}
            className={cn(
              'ml-4 inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              job.isSubscribed
                ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
            )}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : job.isSubscribed ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Unsubscribe
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Subscribe
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
