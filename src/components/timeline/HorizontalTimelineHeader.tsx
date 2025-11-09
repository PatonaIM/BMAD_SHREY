'use client';

/**
 * HorizontalTimelineHeader Component
 *
 * Displays a sticky horizontal timeline showing all stages with their status.
 * Provides a quick overview of the application journey.
 *
 * @module HorizontalTimelineHeader
 */

import React from 'react';
import type { ApplicationStage } from '@/shared/types/applicationStage';
import { Check, Clock, AlertCircle, X } from 'lucide-react';

interface HorizontalTimelineHeaderProps {
  stages: ApplicationStage[];
}

/**
 * Get stage display name from type
 */
const getStageDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    submit_application: 'Submitted',
    ai_interview: 'AI Interview',
    under_review: 'Review',
    assignment: 'Assignment',
    live_interview: 'Interview',
    offer: 'Offer',
    offer_accepted: 'Accepted',
    disqualified: 'Disqualified',
  };
  return names[type] || type;
};

/**
 * Get icon for stage status
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <Check className="h-3 w-3" />;
    case 'in_progress':
    case 'awaiting_candidate':
    case 'awaiting_recruiter':
      return <Clock className="h-3 w-3" />;
    case 'skipped':
      return <X className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

/**
 * Get colors for stage status
 */
const getStatusColors = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        connector: 'bg-green-500',
      };
    case 'in_progress':
    case 'awaiting_candidate':
    case 'awaiting_recruiter':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        connector: 'bg-blue-500',
      };
    case 'skipped':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-500 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-600',
        connector: 'bg-gray-300',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900',
        text: 'text-gray-400 dark:text-gray-500',
        border: 'border-gray-200 dark:border-gray-700',
        connector: 'bg-gray-200',
      };
  }
};

export function HorizontalTimelineHeader({
  stages,
}: HorizontalTimelineHeaderProps): JSX.Element {
  // Sort stages by order (ascending - chronological)
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="sticky top-[0px] z-[100] bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {sortedStages.map((stage, index) => {
            const colors = getStatusColors(stage.status);
            const isLast = index === sortedStages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Stage Item */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status Icon */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${colors.border} ${colors.bg} ${colors.text}`}
                  >
                    {getStatusIcon(stage.status)}
                  </div>

                  {/* Stage Name */}
                  <span
                    className={`text-sm font-medium whitespace-nowrap ${colors.text}`}
                  >
                    {getStageDisplayName(stage.type)}
                  </span>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`h-0.5 w-8 flex-shrink-0 ${colors.connector}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
