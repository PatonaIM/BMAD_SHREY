/**
 * useStages Hook
 *
 * Custom hook for fetching and managing application stages.
 * Uses tRPC for data fetching with automatic caching and revalidation.
 *
 * @module useStages
 */

import { trpc } from '@/services/trpc/client';
import type { ApplicationStage } from '@/shared/types/applicationStage';

interface UseStagesOptions {
  /** Application ID to fetch stages for */
  applicationId: string;

  /** Whether to enable the query */
  enabled?: boolean;

  /** Refetch interval in milliseconds */
  refetchInterval?: number;
}

interface UseStagesReturn {
  /** Array of stages */
  stages: ApplicationStage[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Refetch function */
  refetch: () => Promise<void>;

  /** Stage statistics */
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    skipped: number;
    progress: number;
  };

  /** Active stage (in_progress or awaiting) */
  activeStage: ApplicationStage | undefined;

  /** Next pending stage */
  nextPendingStage: ApplicationStage | undefined;
}

/**
 * Hook to fetch and manage application stages
 */
export function useStages({
  applicationId,
  enabled = true,
  refetchInterval,
}: UseStagesOptions): UseStagesReturn {
  // Fetch stages using tRPC
  const { data, isLoading, error, refetch } = trpc.stages.list.useQuery(
    { applicationId },
    {
      enabled,
      refetchInterval,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  // Extract data from response (cast to expected type since tRPC serializes dates)
  const stages = (data?.stages ?? []) as unknown as ApplicationStage[];
  const activeStage = data?.activeStage as unknown as
    | ApplicationStage
    | undefined;
  const apiStats = data?.stats;

  // Calculate statistics (use API stats if available, otherwise calculate)
  const stats = apiStats ?? {
    total: stages.length,
    completed: stages.filter(s => s.status === 'completed').length,
    inProgress: stages.filter(s => s.status === 'in_progress').length,
    pending: stages.filter(s => s.status === 'pending').length,
    skipped: stages.filter(s => s.status === 'skipped').length,
    progress:
      stages.length > 0
        ? Math.round(
            (stages.filter(s => s.status === 'completed').length /
              stages.length) *
              100
          )
        : 0,
  };

  // Find next pending stage
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const nextPendingStage = sortedStages.find(s => s.status === 'pending');

  return {
    stages,
    isLoading,
    error: error ? (error as unknown as Error) : null,
    refetch: async () => {
      await refetch();
    },
    stats,
    activeStage,
    nextPendingStage,
  };
}
