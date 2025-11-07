'use client';

import type { Application } from '@/shared/types/application';

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

      {/* Timeline Preview */}
      {application.timeline && application.timeline.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Recent Activity
          </h4>
          <div className="space-y-2">
            {application.timeline
              .slice(-3)
              .reverse()
              .map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-sm border-l-2 border-gray-300 dark:border-gray-600 pl-3"
                >
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium capitalize">
                      {event.status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(event.timestamp)}
                      {event.note && ` • ${event.note}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Resume Link */}
      {application.resumeVersionId && (
        <div>
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
