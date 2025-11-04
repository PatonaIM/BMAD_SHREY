/**
 * useInterviewTimer Hook
 * Manages interview timer state and duration tracking
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInterviewTimerOptions {
  autoStart?: boolean;
  maxDuration?: number; // in seconds
  onMaxDurationReached?: () => void;
}

export interface UseInterviewTimerReturn {
  elapsedTime: number;
  formattedTime: string;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  hasReachedMaxDuration: boolean;
}

export function useInterviewTimer(
  options: UseInterviewTimerOptions = {}
): UseInterviewTimerReturn {
  const { autoStart = false, maxDuration, onMaxDurationReached } = options;

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [hasReachedMaxDuration, setHasReachedMaxDuration] =
    useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pausedTimeRef.current = elapsedTime * 1000;
    setIsRunning(false);
  }, [elapsedTime]);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setElapsedTime(0);
    setIsRunning(false);
    setHasReachedMaxDuration(false);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const newElapsedTime = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        setElapsedTime(newElapsedTime);

        // Check max duration
        if (
          maxDuration &&
          newElapsedTime >= maxDuration &&
          !hasReachedMaxDuration
        ) {
          setHasReachedMaxDuration(true);
          onMaxDurationReached?.();
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, maxDuration, hasReachedMaxDuration, onMaxDurationReached]);

  // Auto-start if specified
  useEffect(() => {
    if (autoStart && !startTimeRef.current) {
      start();
    }
  }, [autoStart, start]);

  // Format time as MM:SS
  const formattedTime = `${Math.floor(elapsedTime / 60)
    .toString()
    .padStart(2, '0')}:${(elapsedTime % 60).toString().padStart(2, '0')}`;

  return {
    elapsedTime,
    formattedTime,
    isRunning,
    start,
    pause,
    resume,
    reset,
    hasReachedMaxDuration,
  };
}
