/**
 * TimelineEvent Component
 * Individual timeline event with icon, badge, and details
 */

'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ApplicationTimelineEvent } from '@/shared/types/application';
import { TimelineService } from '@/lib/services/timelineService';
import { cn } from '@/lib/utils/cn';

interface TimelineEventProps {
  event: ApplicationTimelineEvent;
  isLast?: boolean;
}

/**
 * Get icon component for event status
 */
function getEventIcon(status: string) {
  const icons = {
    submitted: FileText,
    ai_interview: MessageSquare,
    under_review: Clock,
    interview_scheduled: Calendar,
    offer: CheckCircle2,
    rejected: AlertCircle,
  };
  return icons[status as keyof typeof icons] || Clock;
}

/**
 * Get color classes for event status
 */
function getEventColor(status: string) {
  const colors = {
    submitted: 'bg-blue-500 text-blue-50',
    ai_interview: 'bg-purple-500 text-purple-50',
    under_review: 'bg-amber-500 text-amber-50',
    interview_scheduled: 'bg-indigo-500 text-indigo-50',
    offer: 'bg-green-500 text-green-50',
    rejected: 'bg-red-500 text-red-50',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-500 text-gray-50';
}

/**
 * TimelineEvent - Visual timeline item with icon, badge, and expandable details
 */
export function TimelineEvent({ event, isLast = false }: TimelineEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getEventIcon(event.status);
  const hasDetails = !!event.note;

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Icon badge */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          getEventColor(event.status)
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Event content */}
      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Status label */}
            <h3 className="font-medium text-gray-900 dark:text-white">
              {TimelineService.getStatusLabel(event.status)}
            </h3>

            {/* Actor and time */}
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{TimelineService.getActorLabel(event.actorType)}</span>
              <span>•</span>
              <span>{TimelineService.getRelativeTime(event.timestamp)}</span>
              <span>•</span>
              <span>{TimelineService.getFormattedTime(event.timestamp)}</span>
            </div>

            {/* Note preview */}
            {hasDetails && !isExpanded && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {event.note}
              </p>
            )}

            {/* Expanded details */}
            {hasDetails && isExpanded && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {event.note}
                </p>
                {event.actorId && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Actor ID: {event.actorId}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Expand button */}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
