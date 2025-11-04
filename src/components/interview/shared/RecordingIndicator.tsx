/**
 * RecordingIndicator Component
 * Visual indicator for recording status with multiple display variants
 */

'use client';

import React from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'error';
export type RecordingIndicatorVariant = 'full' | 'compact' | 'minimal';

export interface RecordingIndicatorProps {
  state: RecordingState;
  variant?: RecordingIndicatorVariant;
  duration?: string;
  size?: string;
  className?: string;
}

export function RecordingIndicator({
  state,
  variant = 'full',
  duration,
  size,
  className = '',
}: RecordingIndicatorProps) {
  const formatSize = (bytes: string | undefined): string => {
    if (!bytes) return '';
    const num = parseFloat(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (state === 'idle') {
    return null;
  }

  // Minimal variant - just the red dot
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center ${className}`}>
        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
        {state === 'paused' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          </div>
        )}
        {state === 'error' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // Compact variant - dot + text
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {state === 'recording' && (
          <>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              REC
            </span>
            {duration && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {duration}
              </span>
            )}
          </>
        )}
        {state === 'paused' && (
          <>
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              PAUSED
            </span>
            {duration && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {duration}
              </span>
            )}
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-3 h-3 bg-red-600 rounded-full" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              ERROR
            </span>
          </>
        )}
      </div>
    );
  }

  // Full variant - complete info with background
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
        state === 'recording'
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : state === 'paused'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      } ${className}`}
    >
      {state === 'recording' && (
        <>
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
              RECORDING
            </span>
            {duration && (
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {duration}
              </span>
            )}
            {size && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatSize(size)}
              </span>
            )}
          </div>
        </>
      )}
      {state === 'paused' && (
        <>
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
              PAUSED
            </span>
            {duration && (
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {duration}
              </span>
            )}
            {size && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatSize(size)}
              </span>
            )}
          </div>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="w-3 h-3 bg-red-600 rounded-full" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            RECORDING ERROR
          </span>
        </>
      )}
    </div>
  );
}
