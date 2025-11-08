/**
 * useTimeline Hook
 * Fetches and manages timeline data for applications
 */

import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/services/trpc/client';

interface UseTimelineOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useTimeline(
  applicationId: string,
  options: UseTimelineOptions = {}
) {
  const queryClient = useQueryClient();

  // Fetch timeline using tRPC hook
  const timelineQuery = trpc.recruiter.getTimeline.useQuery(
    { applicationId },
    {
      enabled: options.enabled !== false && !!applicationId,
      refetchInterval: options.refetchInterval,
      staleTime: 60 * 1000, // 1 minute
    }
  );

  // Add timeline event mutation using tRPC hook
  const addEventMutation = trpc.recruiter.addTimelineEvent.useMutation({
    onSuccess: () => {
      // Invalidate timeline query to refetch
      queryClient.invalidateQueries({
        queryKey: [['recruiter', 'getTimeline'], { input: { applicationId } }],
      });
      // Also invalidate applications list
      queryClient.invalidateQueries({
        queryKey: [['recruiter', 'getApplications']],
      });
    },
  });

  return {
    timeline: timelineQuery.data?.timeline || [],
    isLoading: timelineQuery.isLoading,
    isError: timelineQuery.isError,
    error: timelineQuery.error,
    refetch: timelineQuery.refetch,
    addEvent: addEventMutation.mutate,
    isAddingEvent: addEventMutation.isPending,
  };
}
