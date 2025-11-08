/**
 * TimelineView Component
 * Full timeline view with date grouping, filters, and event list
 */

'use client';

import { useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import type { ApplicationTimelineEvent } from '@/shared/types/application';
import { TimelineService } from '@/lib/services/timelineService';
import { TimelineEvent } from './TimelineEvent';
import { LoadingSpinner } from '@/components/ui/OptimisticLoader';

interface TimelineViewProps {
  applicationId: string;
  timeline: ApplicationTimelineEvent[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * TimelineView - Full timeline with date grouping and filtering
 */
export function TimelineView({
  applicationId: _applicationId,
  timeline,
  isLoading = false,
  onRefresh,
}: TimelineViewProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedActors, setSelectedActors] = useState<
    Array<'system' | 'recruiter' | 'candidate'>
  >([]);

  // Apply filters
  let filteredTimeline = timeline;
  if (selectedStatuses.length > 0) {
    filteredTimeline = TimelineService.filterByStatus(
      filteredTimeline,
      selectedStatuses
    );
  }
  if (selectedActors.length > 0) {
    filteredTimeline = TimelineService.filterByActorType(
      filteredTimeline,
      selectedActors
    );
  }

  // Sort by timestamp (newest first)
  const sortedTimeline = TimelineService.sortByTimestamp(
    filteredTimeline,
    'desc'
  );

  // Group by date
  const groupedTimeline = TimelineService.groupByDate(sortedTimeline);
  const groupedArray = Array.from(groupedTimeline.entries());

  // Filter toggle handlers (for future filter UI implementation)
  // const handleStatusToggle = (status: string) => {
  //   setSelectedStatuses(prev =>
  //     prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
  //   );
  // };

  // const handleActorToggle = (actor: 'system' | 'recruiter' | 'candidate') => {
  //   setSelectedActors(prev =>
  //     prev.includes(actor) ? prev.filter(a => a !== actor) : [...prev, actor]
  //   );
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No timeline events yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Timeline
        </h2>
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Refresh timeline"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline events grouped by date */}
      <div className="space-y-8">
        {groupedArray.map(([dateKey, events]) => {
          const firstEvent = events[0];
          if (!firstEvent) return null;

          return (
            <div key={dateKey}>
              {/* Date header */}
              <div className="mb-4 flex items-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {TimelineService.getDateHeader(firstEvent.timestamp)}
                </h3>
                <div className="ml-4 flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>

              {/* Events for this date */}
              <div className="space-y-0">
                {events.map((event, index) => (
                  <TimelineEvent
                    key={`${event.timestamp}-${index}`}
                    event={event}
                    isLast={
                      index === events.length - 1 &&
                      dateKey === groupedArray[groupedArray.length - 1]?.[0]
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state after filtering */}
      {sortedTimeline.length === 0 && timeline.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No events match the selected filters
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedStatuses([]);
              setSelectedActors([]);
            }}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
