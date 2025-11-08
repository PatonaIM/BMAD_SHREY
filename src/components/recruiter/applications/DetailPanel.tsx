'use client';

import type { Application } from '@/shared/types/application';
import { useTimeline } from '@/hooks/recruiter/useTimeline';
import { TimelineView } from '@/components/recruiter/timeline/TimelineView';

interface DetailPanelProps {
  application: Application;
}

/**
 * DetailPanel - Expanded view showing full application details
 * Displays: profile data, skills, experience, timeline preview
 */
export function DetailPanel({ application }: DetailPanelProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Fetch timeline data with real-time updates
  const { timeline, isLoading, refetch } = useTimeline(
    application._id.toString()
  );

  // Convert timestamp strings to Date objects
  const normalizedTimeline = timeline.map(event => ({
    ...event,
    timestamp: new Date(event.timestamp),
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Application Details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Application Details
        </h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Job Title</dt>
            <dd className="text-gray-900 dark:text-white font-medium">
              {application.jobTitle || 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Company</dt>
            <dd className="text-gray-900 dark:text-white font-medium">
              {application.jobCompany || 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Applied On</dt>
            <dd className="text-gray-900 dark:text-white font-medium">
              {formatDate(application.appliedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Match Score</dt>
            <dd className="text-gray-900 dark:text-white font-medium">
              {application.matchScore !== undefined
                ? `${Math.round(application.matchScore)}%`
                : 'Not calculated'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Score Breakdown */}
      {application.scoreBreakdown && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Score Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(application.scoreBreakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {key}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(value as number)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Timeline with Enhanced Visuals */}
      <div>
        <TimelineView
          applicationId={application._id.toString()}
          timeline={normalizedTimeline}
          isLoading={isLoading}
          onRefresh={refetch}
        />
      </div>

      {/* Resume Link */}
      {application.resumeVersionId && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={`/api/resume/${application.resumeVersionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
          >
            View Resume
          </a>
        </div>
      )}
    </div>
  );
}
