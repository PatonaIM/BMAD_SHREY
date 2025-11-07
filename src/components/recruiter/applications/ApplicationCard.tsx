'use client';

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { InlineActions } from './InlineActions';
import { DetailPanel } from './DetailPanel';
import type { Application } from '@/shared/types/application';

interface ApplicationCardProps {
  application: Application;
  onFeedback?: (_applicationId: string) => void;
  onSchedule?: (_applicationId: string) => void;
  onShare?: (_applicationId: string) => void;
  onView?: (_applicationId: string) => void;
}

/**
 * ApplicationCard - Individual application display with inline expansion
 * Features:
 * - Score badge with color coding
 * - Inline expansion with Framer Motion (300ms)
 * - Inline actions toolbar
 * - Detail panel when expanded
 */
export function ApplicationCard({
  application,
  onFeedback,
  onSchedule,
  onShare,
  onView,
}: ApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score?: number) => {
    if (!score) {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
    if (score >= 80) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (score >= 60) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'under_review':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'interview_scheduled':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'offer':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800',
        'shadow-sm hover:shadow-md transition-all duration-200'
      )}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {application.candidateEmail}
              </h3>
              {application.matchScore !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    getScoreColor(application.matchScore)
                  )}
                >
                  {Math.round(application.matchScore)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  getStatusColor(application.status)
                )}
              >
                {formatStatus(application.status)}
              </span>
              <span>•</span>
              <span>Applied {formatDate(application.appliedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'rounded-lg p-2',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
            )}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Inline Actions Toolbar */}
        <div className="mt-3">
          <InlineActions
            applicationId={application._id}
            onFeedback={() => onFeedback?.(application._id)}
            onSchedule={() => onSchedule?.(application._id)}
            onShare={() => onShare?.(application._id)}
            onView={() => onView?.(application._id)}
          />
        </div>
      </div>

      {/* Expandable Detail Panel */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
      >
        {isExpanded && <DetailPanel application={application} />}
      </motion.div>
    </div>
  );
}
