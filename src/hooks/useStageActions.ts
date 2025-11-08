/**
 * useStageActions Hook
 *
 * Custom hook for managing stage actions (mutations).
 * Handles status updates, data modifications, and stage creation/deletion.
 *
 * @module useStageActions
 */

import { trpc } from '@/services/trpc/client';
import type {
  StageStatus,
  StageData,
  StageType,
} from '@/shared/types/applicationStage';

interface UseStageActionsOptions {
  /** Application ID for optimistic updates */
  applicationId: string;

  /** Callback when action succeeds */
  onSuccess?: () => void;

  /** Callback when action fails */
  onError?: (_error: Error) => void;
}

interface UseStageActionsReturn {
  /** Update stage status */
  updateStatus: (_stageId: string, _status: StageStatus) => Promise<void>;

  /** Add or update stage data */
  addData: (_stageId: string, _data: Partial<StageData>) => Promise<void>;

  /** Create a new stage */
  createStage: (_data: {
    type: StageType;
    status?: StageStatus;
    data?: Partial<StageData>;
  }) => Promise<void>;

  /** Delete a stage */
  deleteStage: (_stageId: string) => Promise<void>;

  /** Loading states for each action */
  isUpdatingStatus: boolean;
  isAddingData: boolean;
  isCreating: boolean;
  isDeleting: boolean;
}

/**
 * Hook to manage stage actions with optimistic updates
 */
export function useStageActions({
  applicationId,
  onSuccess,
  onError,
}: UseStageActionsOptions): UseStageActionsReturn {
  const utils = trpc.useUtils();

  // Update status mutation
  const updateStatusMutation = trpc.stages.updateStatus.useMutation({
    onSuccess: () => {
      // Invalidate stages list to refetch
      utils.stages.list.invalidate({ applicationId });
      onSuccess?.();
    },
    onError: error => {
      onError?.(error as unknown as Error);
    },
  });

  // Add data mutation
  const addDataMutation = trpc.stages.addData.useMutation({
    onSuccess: () => {
      utils.stages.list.invalidate({ applicationId });
      onSuccess?.();
    },
    onError: error => {
      onError?.(error as unknown as Error);
    },
  });

  // Create stage mutation
  const createStageMutation = trpc.stages.create.useMutation({
    onSuccess: () => {
      utils.stages.list.invalidate({ applicationId });
      onSuccess?.();
    },
    onError: error => {
      onError?.(error as unknown as Error);
    },
  });

  // Delete stage mutation
  const deleteStageMutation = trpc.stages.delete.useMutation({
    onSuccess: () => {
      utils.stages.list.invalidate({ applicationId });
      onSuccess?.();
    },
    onError: error => {
      onError?.(error as unknown as Error);
    },
  });

  return {
    updateStatus: async (stageId: string, status: StageStatus) => {
      await updateStatusMutation.mutateAsync({
        applicationId,
        stageId,
        newStatus: status,
      });
    },
    addData: async (stageId: string, data: Partial<StageData>) => {
      await addDataMutation.mutateAsync({
        applicationId,
        stageId,
        data: data as Record<string, unknown>,
      });
    },
    createStage: async data => {
      await createStageMutation.mutateAsync({
        applicationId,
        type: data.type,
        data: (data.data as Record<string, unknown>) ?? {},
      });
    },
    deleteStage: async (stageId: string) => {
      await deleteStageMutation.mutateAsync({ applicationId, stageId });
    },
    isUpdatingStatus: updateStatusMutation.isPending,
    isAddingData: addDataMutation.isPending,
    isCreating: createStageMutation.isPending,
    isDeleting: deleteStageMutation.isPending,
  };
}
