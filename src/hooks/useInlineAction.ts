'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface UseInlineActionOptions<TData, TVariables> {
  /**
   * Mutation function to execute
   */
  mutationFn: (_variables: TVariables) => Promise<TData>;

  /**
   * Query keys to invalidate after successful mutation
   */
  invalidateKeys?: string[][];

  /**
   * Optimistic update function - called immediately with variables
   */
  onOptimisticUpdate?: (_variables: TVariables) => void;

  /**
   * Rollback function - called if mutation fails
   */
  onRollback?: () => void;

  /**
   * Success callback - called after successful mutation
   */
  onSuccess?: (_data: TData) => void;

  /**
   * Error callback - called if mutation fails
   */
  onError?: (_error: Error) => void;

  /**
   * Toast notification messages
   */
  toastMessages?: {
    loading?: string;
    success?: string;
    error?: string;
  };
}

/**
 * useInlineAction - Hook for inline actions with optimistic updates
 *
 * Features:
 * - Optimistic cache updates (instant UI response)
 * - Automatic rollback on error
 * - Toast notifications
 * - Automatic refetch on success
 *
 * @example
 * ```tsx
 * const ratingAction = useInlineAction({
 *   mutationFn: async (rating) => {
 *     return trpc.recruiter.addFeedback.mutate({ applicationId, rating });
 *   },
 *   invalidateKeys: [['applications'], ['application', applicationId]],
 *   onSuccess: () => console.log('Rating saved!'),
 *   toastMessages: {
 *     success: 'Feedback submitted successfully',
 *     error: 'Failed to submit feedback'
 *   }
 * });
 *
 * // Use it
 * await ratingAction.execute(5);
 * ```
 */
export function useInlineAction<TData = unknown, TVariables = unknown>({
  mutationFn,
  invalidateKeys = [],
  onOptimisticUpdate,
  onRollback,
  onSuccess,
  onError,
  toastMessages,
}: UseInlineActionOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState(false);

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Show loading state
      if (toastMessages?.loading) {
        showToast(toastMessages.loading, 'loading');
      }

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await Promise.all(
        invalidateKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
      );

      // Apply optimistic update if provided
      if (onOptimisticUpdate) {
        setIsOptimistic(true);
        onOptimisticUpdate(variables);
      }

      // Snapshot the previous values for rollback
      const previousData = invalidateKeys.map(key => ({
        key,
        data: queryClient.getQueryData(key),
      }));

      return { previousData };
    },
    onSuccess: (data: TData) => {
      setIsOptimistic(false);

      // Invalidate and refetch queries
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Show success toast
      if (toastMessages?.success) {
        showToast(toastMessages.success, 'success');
      }

      // Call success callback
      onSuccess?.(data);
    },
    onError: (error: Error, _variables: TVariables, context: unknown) => {
      setIsOptimistic(false);

      // Rollback optimistic update
      if (context && typeof context === 'object' && 'previousData' in context) {
        const { previousData } = context as {
          previousData: Array<{ key: string[]; data: unknown }>;
        };
        previousData.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }

      // Call rollback callback
      onRollback?.();

      // Show error toast
      const errorMessage =
        toastMessages?.error || error.message || 'An error occurred';
      showToast(errorMessage, 'error');

      // Call error callback
      onError?.(error);
    },
  });

  return {
    execute: mutation.mutate,
    executeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isOptimistic,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Simple toast notification helper
 * In a real app, replace this with your toast library (e.g., react-hot-toast, sonner)
 */
function showToast(
  message: string,
  type: 'loading' | 'success' | 'error' = 'success'
) {
  // For now, use console.log - replace with actual toast library
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '⏳';
  // eslint-disable-next-line no-console
  console.log(`${prefix} ${message}`);

  // TODO: Integrate with toast library
  // Example with react-hot-toast:
  // if (type === 'error') toast.error(message);
  // else if (type === 'success') toast.success(message);
  // else toast.loading(message);
}
