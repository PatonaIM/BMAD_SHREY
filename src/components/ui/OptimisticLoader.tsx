'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OptimisticLoaderProps {
  isLoading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'pulse' | 'skeleton';
}

/**
 * OptimisticLoader - Loading indicator for optimistic updates
 * Shows minimal feedback during async operations
 *
 * Usage:
 * ```tsx
 * <OptimisticLoader isLoading={isSubmitting}>
 *   <button>Submit</button>
 * </OptimisticLoader>
 * ```
 */
export function OptimisticLoader({
  isLoading = false,
  loadingText,
  children,
  className,
  size = 'md',
  variant = 'spinner',
}: OptimisticLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('relative inline-flex items-center', className)}>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md"
          >
            <Loader2
              className={cn('animate-spin text-indigo-600', sizeClasses[size])}
            />
            {loadingText && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {loadingText}
              </span>
            )}
          </motion.div>
        )}
        {children}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('relative', className)}>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/20 rounded-md animate-pulse"
          />
        )}
        {children}
      </div>
    );
  }

  // Skeleton variant
  return isLoading ? (
    <div className={cn('animate-pulse space-y-3', className)}>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
    </div>
  ) : (
    <>{children}</>
  );
}

/**
 * LoadingSpinner - Simple spinner component
 */
export function LoadingSpinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-indigo-600 dark:text-indigo-400',
        sizeClasses[size],
        className
      )}
    />
  );
}

/**
 * SkeletonCard - Card skeleton for loading states
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  );
}

/**
 * SkeletonList - List of skeleton cards
 */
export function SkeletonList({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
