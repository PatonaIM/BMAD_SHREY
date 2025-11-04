/**
 * useRecordingStatus Hook
 * Manages recording state and provides status information
 */

import { useState, useCallback } from 'react';

export type RecordingState =
  | 'idle'
  | 'initializing'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'error';

export interface RecordingStatusData {
  state: RecordingState;
  duration: number;
  size: number; // in bytes
  error: string | null;
}

export interface UseRecordingStatusReturn extends RecordingStatusData {
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setError: (_error: string) => void;
  updateDuration: (_duration: number) => void;
  updateSize: (_size: number) => void;
  reset: () => void;
}

const initialState: RecordingStatusData = {
  state: 'idle',
  duration: 0,
  size: 0,
  error: null,
};

export function useRecordingStatus(): UseRecordingStatusReturn {
  const [status, setStatus] = useState<RecordingStatusData>(initialState);

  const startRecording = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      state: 'initializing',
      error: null,
    }));

    // Transition to recording after initialization
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        state: prev.state === 'initializing' ? 'recording' : prev.state,
      }));
    }, 100);
  }, []);

  const pauseRecording = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      state: prev.state === 'recording' ? 'paused' : prev.state,
    }));
  }, []);

  const resumeRecording = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      state: prev.state === 'paused' ? 'recording' : prev.state,
    }));
  }, []);

  const stopRecording = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      state: 'stopping',
    }));

    // Transition to idle after stopping
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        state: prev.state === 'stopping' ? 'idle' : prev.state,
      }));
    }, 100);
  }, []);

  const setError = useCallback((error: string) => {
    setStatus(prev => ({
      ...prev,
      state: 'error',
      error,
    }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setStatus(prev => ({
      ...prev,
      duration,
    }));
  }, []);

  const updateSize = useCallback((size: number) => {
    setStatus(prev => ({
      ...prev,
      size,
    }));
  }, []);

  const reset = useCallback(() => {
    setStatus(initialState);
  }, []);

  return {
    ...status,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setError,
    updateDuration,
    updateSize,
    reset,
  };
}
