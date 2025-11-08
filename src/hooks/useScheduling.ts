/**
 * useScheduling Hook
 * Frontend hook for scheduling interviews with candidates
 */

import { useState } from 'react';
import { trpc } from '@/services/trpc/client';
import { logger } from '../monitoring/logger';

export interface ScheduleCallInput {
  applicationId: string;
  scheduledAt: Date;
  duration?: number;
  notes?: string;
}

export interface ScheduledCall {
  _id: string;
  applicationId: string;
  recruiterId: string;
  candidateEmail: string;
  jobId: string;
  scheduledAt: string; // ISO string from API
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  meetLink?: string;
  notes?: string;
  googleCalendarEventId?: string;
  createdAt: string; // ISO string from API
}

export interface UseSchedulingResult {
  scheduleCall: (_input: ScheduleCallInput) => Promise<{
    success: boolean;
    callId?: string;
    meetLink?: string;
    error?: string;
  }>;
  scheduledCalls: ScheduledCall[];
  isScheduling: boolean;
  isLoadingCalls: boolean;
  error: string | null;
  refreshCalls: () => void;
  updateCallStatus: (
    _callId: string,
    _status: 'completed' | 'cancelled' | 'no_show' | 'rescheduled',
    _notes?: string
  ) => Promise<boolean>;
}

export function useScheduling(filters?: {
  startDate?: Date;
  endDate?: Date;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
}): UseSchedulingResult {
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query scheduled calls
  const {
    data: callsData,
    isLoading: isLoadingCalls,
    refetch: refreshCalls,
  } = trpc.recruiter.getScheduledCalls.useQuery(
    {
      startDate: filters?.startDate?.toISOString(),
      endDate: filters?.endDate?.toISOString(),
      status: filters?.status,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  );

  // Schedule call mutation
  const scheduleCallMutation = trpc.recruiter.scheduleCall.useMutation({
    onSuccess: () => {
      refreshCalls();
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.recruiter.updateCallStatus.useMutation({
    onSuccess: () => {
      refreshCalls();
    },
  });

  const scheduleCall = async (input: ScheduleCallInput) => {
    setIsScheduling(true);
    setError(null);

    try {
      const result = await scheduleCallMutation.mutateAsync({
        applicationId: input.applicationId,
        scheduledAt: input.scheduledAt.toISOString(),
        duration: input.duration || 30,
        notes: input.notes,
      });

      logger.info({
        event: 'call_scheduled',
        applicationId: input.applicationId,
        callId: result.callId,
      });

      return {
        success: true,
        callId: result.callId,
        meetLink: result.meetLink,
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to schedule call';
      setError(errorMsg);

      logger.error({
        event: 'call_scheduling_error',
        applicationId: input.applicationId,
        error: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setIsScheduling(false);
    }
  };

  const updateCallStatus = async (
    callId: string,
    status: 'completed' | 'cancelled' | 'no_show' | 'rescheduled',
    notes?: string
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        callId,
        status,
        notes,
      });

      logger.info({
        event: 'call_status_updated',
        callId,
        status,
      });

      return true;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update call status';
      setError(errorMsg);

      logger.error({
        event: 'call_status_update_error',
        callId,
        error: errorMsg,
      });

      return false;
    }
  };

  return {
    scheduleCall,
    scheduledCalls: callsData?.calls || [],
    isScheduling,
    isLoadingCalls,
    error,
    refreshCalls,
    updateCallStatus,
  };
}
