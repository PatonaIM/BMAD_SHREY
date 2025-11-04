/**
 * useAudioLevel Hook
 * Monitors audio input level from a media stream
 */

import { useState, useEffect, useRef } from 'react';

export interface UseAudioLevelOptions {
  smoothingTimeConstant?: number;
  fftSize?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

export interface UseAudioLevelReturn {
  audioLevel: number;
  isActive: boolean;
}

export function useAudioLevel(
  stream: MediaStream | null,
  options: UseAudioLevelOptions = {}
): UseAudioLevelReturn {
  const {
    smoothingTimeConstant = 0.8,
    fftSize = 256,
    minDecibels = -90,
    maxDecibels = -10,
  } = options;

  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setAudioLevel(0);
      setIsActive(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setAudioLevel(0);
      setIsActive(false);
      return;
    }

    // Create audio context and analyser
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.smoothingTimeConstant = smoothingTimeConstant;
    analyser.fftSize = fftSize;
    analyser.minDecibels = minDecibels;
    analyser.maxDecibels = maxDecibels;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    setIsActive(true);

    // Monitor audio level
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average level
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 255) * 100);

      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setAudioLevel(0);
      setIsActive(false);
    };
  }, [stream, smoothingTimeConstant, fftSize, minDecibels, maxDecibels]);

  return { audioLevel, isActive };
}
