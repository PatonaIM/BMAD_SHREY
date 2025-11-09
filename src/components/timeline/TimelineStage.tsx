'use client';

/**
 * TimelineStage Component
 *
 * Displays a single stage in the application timeline with icon, content,
 * actions, and timestamps. Includes smooth animations and responsive design.
 *
 * @module TimelineStage
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ApplicationStage } from '@/shared/types/applicationStage';
import { StageIconWithBackground } from './StageIcon';
import { StageActions } from './StageActions';
import { StageDetails } from './StageDetails';
import { formatDistanceToNow } from 'date-fns';

interface TimelineStageProps {
  /** Stage data */
  stage: ApplicationStage;

  /** Current viewing role */
  viewAs: 'candidate' | 'recruiter';

  /** Whether this is the active/current stage */
  isActive?: boolean;

  /** Whether this is the last stage in timeline */
  isLast?: boolean;

  /** Whether this is the first stage in timeline */
  isFirst?: boolean;

  /** Callback when action is clicked */
  onAction?: (_stageId: string, _actionType: string) => void;

  /** Additional CSS classes */
  className?: string;

  /** Optional application data for rich stage details */
  applicationData?: {
    candidateEmail?: string;
    matchScore?: number;
    scoreBreakdown?: {
      semanticSimilarity?: number;
      skillsAlignment?: number;
      experienceLevel?: number;
      otherFactors?: number;
    };
  };

  /** Application ID for actions */
  applicationId?: string;

  /** Job ID for AI interview */
  jobId?: string;
}

/**
 * Maps stage status to display labels
 */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  awaiting_candidate: 'Awaiting Your Action',
  in_progress: 'In Progress',
  awaiting_recruiter: 'Under Review',
  completed: 'Completed',
  skipped: 'Skipped',
};

/**
 * Maps stage status to badge colors
 */
const STATUS_BADGE_COLORS: Record<string, string> = {
  pending:
    'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  awaiting_candidate:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  awaiting_recruiter:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  completed:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  skipped:
    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

export function TimelineStage({
  stage,
  viewAs,
  isActive = false,
  isLast = false,
  isFirst = false,
  onAction,
  className = '',
  applicationData,
  applicationId,
  jobId,
}: TimelineStageProps): JSX.Element {
  // Expand if: active, OR first stage, OR last stage
  // Priority: active > first > last
  const [isExpanded, setIsExpanded] = useState(isActive || isFirst || isLast);

  const statusLabel = STATUS_LABELS[stage.status] || stage.status;
  const badgeColor =
    STATUS_BADGE_COLORS[stage.status] || STATUS_BADGE_COLORS.pending;

  const hasActions =
    (viewAs === 'candidate' && (stage.candidateActions?.length ?? 0) > 0) ||
    (viewAs === 'recruiter' && (stage.recruiterActions?.length ?? 0) > 0);

  // Check if stage has any data to display
  // For AI interview in pending state for candidates, always show (for CTA)
  const hasData =
    (stage.type === 'ai_interview' &&
      viewAs === 'candidate' &&
      (stage.status === 'pending' || stage.status === 'awaiting_candidate')) ||
    (stage.data && Object.keys(stage.data).length > 1); // More than just 'type'

  const handleActionClick = (actionType: string) => {
    onAction?.(stage.id, actionType);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative ${className}`}
    >
      {/* Connector Line */}
      {!isLast && (
        <div
          className={`absolute left-5 top-14 bottom-0 w-0.5 ${
            stage.status === 'completed'
              ? 'bg-green-300 dark:bg-green-700'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Stage Card */}
      <div
        className={`
          relative bg-white dark:bg-neutral-900 rounded-lg border transition-colors
          ${
            isActive
              ? 'border-brand-primary shadow-lg shadow-brand-primary/10'
              : 'border-neutral-200 dark:border-neutral-800 shadow-sm'
          }
        `}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 relative z-10">
              <StageIconWithBackground
                type={stage.type}
                status={stage.status}
                size="md"
                variant="solid"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {stage.title || stage.type.replace(/_/g, ' ')}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badgeColor}`}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Timestamps */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                <span>
                  Created {formatDistanceToNow(new Date(stage.createdAt))} ago
                </span>
                {stage.completedAt && (
                  <span className="text-green-600 dark:text-green-400">
                    Completed {formatDistanceToNow(new Date(stage.completedAt))}{' '}
                    ago
                  </span>
                )}
              </div>

              {/* Expand/Collapse Button */}
              {(hasData || hasActions) && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                  aria-expanded={isExpanded}
                  aria-controls={`stage-details-${stage.id}`}
                >
                  {isExpanded ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      <span>Show Details</span>
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (hasData || hasActions) && (
            <motion.div
              id={`stage-details-${stage.id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Stage-specific data content */}
                {hasData && (
                  <StageDetails
                    stage={stage}
                    applicationData={applicationData}
                    applicationId={applicationId}
                    jobId={jobId}
                    viewAs={viewAs}
                  />
                )}

                {/* Actions */}
                {hasActions && (
                  <StageActions
                    candidateActions={stage.candidateActions}
                    recruiterActions={stage.recruiterActions}
                    viewAs={viewAs}
                    onAction={handleActionClick}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * TimelineStageSkeleton
 *
 * Loading skeleton for timeline stage
 */
export function TimelineStageSkeleton({
  className = '',
}: {
  className?: string;
}): JSX.Element {
  return (
    <div className={`relative ${className} animate-pulse`}>
      <div className="relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
              </div>
              <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
