/**
 * useAudioStream Hook
 * Manages audio capture, processing, and playback for interview
 */

import { useCallback, useRef, useEffect } from 'react';
import { AudioProcessor } from '../../../services/media/audioProcessor';

export interface UseAudioStreamOptions {
  mediaStream: MediaStream | null;
  onAudioLevel?: (_level: number) => void;
  onError?: (_error: string) => void;
}

export interface UseAudioStreamReturn {
  audioProcessor: AudioProcessor | null;
  audioContext: AudioContext | null;
  startAudioProcessing: () => Promise<void>;
  stopAudioProcessing: () => void;
  cleanup: () => void;
}

export function useAudioStream({
  mediaStream,
  onAudioLevel,
  onError,
}: UseAudioStreamOptions): UseAudioStreamReturn {
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startAudioProcessing = useCallback(async () => {
    if (!mediaStream) {
      onError?.('No media stream available');
      return;
    }

    try {
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Initialize audio processor
      audioProcessorRef.current = await AudioProcessor.createFromStream(
        mediaStream,
        { sampleRate: 24000, channels: 1 },
        {
          onAudioLevel: level => {
            onAudioLevel?.(level);
          },
          onAudioData: () => {
            // Audio data handling will be managed by parent component
          },
          onError: err => {
            onError?.(err.message);
          },
        }
      );
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : 'Failed to start audio processing'
      );
    }
  }, [mediaStream, onAudioLevel, onError]);

  const stopAudioProcessing = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
    }
  }, []);

  const cleanup = useCallback(() => {
    stopAudioProcessing();
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, [stopAudioProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    audioProcessor: audioProcessorRef.current,
    audioContext: audioContextRef.current,
    startAudioProcessing,
    stopAudioProcessing,
    cleanup,
  };
}
