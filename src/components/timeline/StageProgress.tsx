/**
 * StageProgress Component
 *
 * Displays a progress indicator showing completion percentage
 * and stage statistics for an application journey.
 *
 * @module StageProgress
 */

import React from 'react';
import { motion } from 'framer-motion';

interface StageProgressProps {
  /** Total number of stages */
  total: number;

  /** Number of completed stages */
  completed: number;

  /** Number of stages in progress */
  inProgress?: number;

  /** Number of pending stages */
  pending?: number;

  /** Number of skipped stages */
  skipped?: number;

  /** Variant style */
  variant?: 'default' | 'compact';

  /** Additional CSS classes */
  className?: string;
}

export function StageProgress({
  total,
  completed,
  inProgress = 0,
  pending = 0,
  skipped = 0,
  variant = 'default',
  className = '',
}: StageProgressProps): JSX.Element {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-sm font-semibold text-muted-foreground min-w-[3rem] text-right">
          {progress}%
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Application Progress
          </span>
          <span className="text-2xl font-bold text-brand-primary">
            {progress}%
          </span>
        </div>
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stage Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1">Total</span>
          <span className="font-semibold text-foreground text-sm">{total}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1">Completed</span>
          <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
            {completed}
          </span>
        </div>

        {inProgress > 0 && (
          <div className="flex flex-col">
            <span className="text-muted-foreground mb-1">In Progress</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
              {inProgress}
            </span>
          </div>
        )}

        {pending > 0 && (
          <div className="flex flex-col">
            <span className="text-muted-foreground mb-1">Pending</span>
            <span className="font-semibold text-neutral-600 dark:text-neutral-400 text-sm">
              {pending}
            </span>
          </div>
        )}

        {skipped > 0 && (
          <div className="flex flex-col">
            <span className="text-muted-foreground mb-1">Skipped</span>
            <span className="font-semibold text-neutral-500 dark:text-neutral-500 text-sm">
              {skipped}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StageProgressSkeleton
 *
 * Loading skeleton for stage progress component
 */
export function StageProgressSkeleton({
  variant = 'default',
  className = '',
}: {
  variant?: 'default' | 'compact';
  className?: string;
}): JSX.Element {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className} animate-pulse`}>
        <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        <div className="w-12 h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className} animate-pulse`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col space-y-1">
            <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
