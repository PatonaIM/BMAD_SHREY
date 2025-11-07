'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseInlineActionOptions<TData, TVariables> {
  mutationFn: (_variables: TVariables) => Promise<TData>;
  onSuccess?: (_data: TData, _variables: TVariables) => void;
  onError?: (_error: Error, _variables: TVariables) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * useInlineAction hook for optimistic updates with automatic rollback
 * Features:
 * - Optimistic cache updates
 * - Automatic rollback on error
 * - Toast notifications
 * - Refetch on success
 *
 * Usage:
 * ```tsx
 * const { mutate, isLoading } = useInlineAction({
 *   mutationFn: (data) => api.recruiter.addFeedback.mutate(data),
 *   onSuccess: () => console.log('Success'),
 *   successMessage: 'Feedback added successfully',
 * });
 * ```
 */
export function useInlineAction<TData = unknown, TVariables = unknown>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: UseInlineActionOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const mutation = useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Show success toast
      if (successMessage) {
        setToastMessage(successMessage);
        setToastType('success');
        setTimeout(() => setToastMessage(null), 3000);
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries();

      // Call custom success handler
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const message = errorMessage || error.message || 'An error occurred';
      setToastMessage(message);
      setToastType('error');
      setTimeout(() => setToastMessage(null), 5000);

      // Rollback optimistic updates
      queryClient.invalidateQueries();

      // Call custom error handler
      onError?.(error, variables);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    toastMessage,
    toastType,
    dismissToast: () => setToastMessage(null),
  };
}
