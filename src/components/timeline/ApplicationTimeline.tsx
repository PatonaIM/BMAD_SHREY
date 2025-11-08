'use client';

/**
 * ApplicationTimeline Component
 *
 * Main timeline component that displays the complete application journey.
 * Shows all stages with progress tracking, role-based visibility,
 * and smooth animations.
 *
 * @module ApplicationTimeline
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TimelineStage, TimelineStageSkeleton } from './TimelineStage';
import { StageProgress, StageProgressSkeleton } from './StageProgress';
import { useStages } from '@/hooks/useStages';

interface ApplicationTimelineProps {
  /** Application ID */
  applicationId: string;

  /** Job ID for AI interview */
  jobId?: string;

  /** Current viewing role */
  viewAs: 'candidate' | 'recruiter';

  /** Callback when action is clicked */
  onAction?: (_stageId: string, _actionType: string) => void;

  /** Whether to auto-scroll to active stage */
  autoScrollToActive?: boolean;

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
}

export function ApplicationTimeline({
  applicationId,
  jobId,
  viewAs,
  onAction,
  autoScrollToActive = true,
  className = '',
  applicationData,
}: ApplicationTimelineProps): JSX.Element {
  const activeStageRef = useRef<HTMLDivElement>(null);

  // Fetch stages using the custom hook
  const { stages, isLoading, error } = useStages({
    applicationId,
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter stages based on visibility
  const visibleStages =
    viewAs === 'candidate'
      ? stages.filter(stage => stage.visibleToCandidate)
      : stages;

  // Sort stages by order
  const sortedStages = [...visibleStages].sort((a, b) => a.order - b.order);

  // Find active stage
  const activeStage = sortedStages.find(
    stage =>
      stage.status === 'in_progress' ||
      stage.status === 'awaiting_candidate' ||
      stage.status === 'awaiting_recruiter'
  );

  // Calculate progress statistics
  const stats = {
    total: sortedStages.length,
    completed: sortedStages.filter(s => s.status === 'completed').length,
    inProgress: sortedStages.filter(s => s.status === 'in_progress').length,
    pending: sortedStages.filter(s => s.status === 'pending').length,
    skipped: sortedStages.filter(s => s.status === 'skipped').length,
  };

  // Auto-scroll to active stage on mount
  useEffect(() => {
    if (autoScrollToActive && activeStageRef.current) {
      setTimeout(() => {
        activeStageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 500);
    }
  }, [autoScrollToActive, activeStage?.id]);

  // Error State
  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 ${className}`}
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
              Failed to load timeline
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error.message ||
                'An error occurred while loading the application timeline.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
          <StageProgressSkeleton />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <TimelineStageSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (sortedStages.length === 0) {
    return (
      <div
        className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center ${className}`}
      >
        <svg
          className="w-12 h-12 text-neutral-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No stages yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Application stages will appear here as your application progresses.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} id={`timeline-${applicationId}`}>
      {/* Progress Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm"
      >
        <h2 className="text-xl font-bold text-foreground mb-4">
          Application Journey
        </h2>
        <StageProgress
          total={stats.total}
          completed={stats.completed}
          inProgress={stats.inProgress}
          pending={stats.pending}
          skipped={stats.skipped}
        />
      </motion.div>

      {/* Timeline Stages */}
      <div className="space-y-4">
        {sortedStages.map((stage, index) => {
          const isActive = activeStage?.id === stage.id;
          const isLast = index === sortedStages.length - 1;

          return (
            <div
              key={stage.id}
              ref={isActive ? activeStageRef : null}
              id={`stage-${stage.id}`}
            >
              <TimelineStage
                stage={stage}
                viewAs={viewAs}
                isActive={isActive}
                isLast={isLast}
                onAction={onAction}
                applicationData={applicationData}
                applicationId={applicationId}
                jobId={jobId}
              />
            </div>
          );
        })}
      </div>

      {/* Next Steps Footer (Optional) */}
      {activeStage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Next Steps
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {activeStage.status === 'awaiting_candidate'
                  ? 'Action required from you to continue.'
                  : activeStage.status === 'awaiting_recruiter'
                    ? 'The recruiter is reviewing your progress.'
                    : 'This stage is currently in progress.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
