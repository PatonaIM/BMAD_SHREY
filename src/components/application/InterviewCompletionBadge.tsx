'use client';

import React from 'react';

interface InterviewCompletionBadgeProps {
  scoreBoost?: number;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function InterviewCompletionBadge({
  scoreBoost,
  variant = 'default',
  className = '',
}: InterviewCompletionBadgeProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full text-xs font-medium text-green-700 dark:text-green-300 ${className}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>Interview Complete</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg ${className}`}
      >
        <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-900 dark:text-green-100">
              AI Interview Completed
            </span>
            {scoreBoost !== undefined && scoreBoost > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                +{scoreBoost.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            {scoreBoost !== undefined && scoreBoost > 0
              ? `Score boosted by ${scoreBoost.toFixed(1)} points`
              : 'Interview analysis complete'}
          </p>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg ${className}`}
    >
      <svg
        className="w-5 h-5 text-green-600 dark:text-green-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-green-900 dark:text-green-100">
          Interview Complete
        </span>
        {scoreBoost !== undefined && scoreBoost > 0 && (
          <span className="text-xs text-green-700 dark:text-green-300">
            +{scoreBoost.toFixed(1)} point boost
          </span>
        )}
      </div>
    </div>
  );
}
