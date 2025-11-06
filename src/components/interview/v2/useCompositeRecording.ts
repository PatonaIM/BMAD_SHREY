// EP5-S4: React hook for composite recording lifecycle
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CompositeRecorder,
  CompositeRecordingMetadata,
} from '../../../services/interview/compositeRecorder';
import { logger } from '../../../monitoring/logger';

interface UseCompositeRecordingOptions {
  applicationId: string;
  enabled?: boolean; // Enable/disable recording
  autoStart?: boolean; // Start automatically when enabled
  progressiveUpload?: boolean; // Enable progressive chunk upload
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  hasError: boolean;
  metadata?: CompositeRecordingMetadata;
  chunkCount: number;
}

export function useCompositeRecording(options: UseCompositeRecordingOptions) {
  const {
    applicationId,
    enabled = true,
    autoStart = false,
    progressiveUpload = false,
  } = options;

  const recorderRef = useRef<CompositeRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blockIdsRef = useRef<string[]>([]);
  const pendingUploadsRef = useRef<Set<number>>(new Set()); // Track pending upload chunk indices
  const uploadQueueRef = useRef<
    Array<{ blob: Blob; index: number; sessionId: string }>
  >([]); // Queue for sequential uploads
  const isUploadingRef = useRef(false); // Flag to track if upload is in progress

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    hasError: false,
    chunkCount: 0,
  });

  /**
   * Process upload queue sequentially to ensure chunks are uploaded in order
   */
  const processUploadQueue = useCallback(async () => {
    // If already uploading or queue is empty, return
    if (isUploadingRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    isUploadingRef.current = true;

    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current.shift();
      if (!item) break;

      const { blob, index, sessionId } = item;

      try {
        // Generate block ID (base64 encoded, same length for all blocks)
        const blockId = btoa(`block-${index.toString().padStart(6, '0')}`);

        // Check for duplicate block ID (prevent race conditions)
        if (blockIdsRef.current.includes(blockId)) {
          // eslint-disable-next-line no-console
          console.warn('[Recording] Skipping duplicate block ID', {
            index,
            blockId,
          });
          pendingUploadsRef.current.delete(index);
          continue;
        }

        blockIdsRef.current.push(blockId);

        // eslint-disable-next-line no-console
        console.log('[Recording] Uploading chunk sequentially', {
          index,
          sessionId,
          size: blob.size,
          blockId,
          queueSize: uploadQueueRef.current.length,
          pendingCount: pendingUploadsRef.current.size,
        });

        // Upload chunk via API
        const formData = new FormData();
        formData.append('chunk', blob);
        formData.append('sessionId', sessionId);
        formData.append('blockId', blockId);
        formData.append('isFirst', index === 1 ? 'true' : 'false');

        const response = await fetch('/api/interview/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          // eslint-disable-next-line no-console
          console.error('[Recording] Chunk upload failed', {
            index,
            status: response.status,
            error,
          });
          throw new Error(`Chunk upload failed: ${JSON.stringify(error)}`);
        }

        // eslint-disable-next-line no-console
        console.log('[Recording] Chunk uploaded successfully', {
          index,
          blockId,
          remainingQueue: uploadQueueRef.current.length,
          remainingPending: pendingUploadsRef.current.size - 1,
        });
      } catch (err) {
        // Log errors for debugging
        logger.error({
          event: 'progressive_chunk_upload_failed',
          applicationId,
          chunkIndex: index,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        // Mark this upload as complete (whether success or failure)
        pendingUploadsRef.current.delete(index);
      }
    }

    isUploadingRef.current = false;
  }, [applicationId]);

  /**
   * Start recording
   */
  const startRecording = useCallback(
    async (containerElement: HTMLElement) => {
      if (!enabled || recorderRef.current) {
        logger.warn({
          event: 'composite_recording_start_blocked',
          reason: !enabled ? 'disabled' : 'already_recording',
        });
        return;
      }

      try {
        // Get streams from window globals (set by DevicePermissionGate)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const localStream = w.__interviewV2LocalStream as
          | MediaStream
          | undefined;
        const aiAudioStream = w.__interviewV2RemoteStream as
          | MediaStream
          | undefined;

        if (!localStream) {
          throw new Error('Local stream not available');
        }

        // Initialize progressive upload if enabled
        if (progressiveUpload) {
          // Initialize empty arrays and clear all state
          blockIdsRef.current = [];
          pendingUploadsRef.current.clear();
          uploadQueueRef.current = [];
          isUploadingRef.current = false;
          // eslint-disable-next-line no-console
          console.log('[Recording] Progressive upload enabled', {
            applicationId,
          });
        }

        // Create recorder
        const recorder = new CompositeRecorder({
          rootElement: containerElement,
          localStream,
          aiAudioStream,
          fps: 30,
          chunkMs: 5000, // 5-second chunks (reduced from 1s to minimize network overhead)
          onChunk: async (blob, index) => {
            chunksRef.current.push(blob);
            setRecordingState(prev => ({ ...prev, chunkCount: index }));

            // Progressive upload if enabled and context available
            if (progressiveUpload) {
              // Get sessionId from window (set by useInterviewController)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sessionId = (window as any).__interviewSessionId;

              if (!sessionId) {
                // eslint-disable-next-line no-console
                console.warn(
                  '[Recording] Skipping chunk upload - no session ID',
                  { index }
                );
                return; // Skip upload silently
              }

              // Add to upload queue and track as pending
              pendingUploadsRef.current.add(index);
              uploadQueueRef.current.push({ blob, index, sessionId });

              // eslint-disable-next-line no-console
              console.log('[Recording] Chunk added to upload queue', {
                index,
                queueSize: uploadQueueRef.current.length,
              });

              // Process the queue (will process sequentially)
              processUploadQueue();
            }
          },
          onMetadata: meta => {
            setRecordingState(prev => ({ ...prev, metadata: meta }));
            // Metadata logged only on completion, not during recording
          },
          onError: err => {
            // Don't mark as error if it's just tracks being removed (happens when streams update)
            if (!err.message.includes('Tracks in MediaStream were removed')) {
              setRecordingState(prev => ({
                ...prev,
                hasError: true,
                isRecording: false,
              }));
            }

            logger.error({
              event: 'composite_recording_error',
              applicationId,
              error: err.message,
            });
          },
        });

        // Start recording
        const result = recorder.start();

        if (!result) {
          throw new Error('Failed to start recording');
        }

        recorderRef.current = recorder;
        setRecordingState(prev => ({ ...prev, isRecording: true }));
        // Recording started - logging minimized for performance
      } catch (err) {
        logger.error({
          event: 'composite_recording_start_failed',
          applicationId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        setRecordingState(prev => ({ ...prev, hasError: true }));
      }
    },
    [applicationId, enabled, progressiveUpload]
  );

  /**
   * Stop recording and return final blob
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current) {
      return null;
    }

    recorderRef.current.stop();
    setRecordingState(prev => ({ ...prev, isRecording: false }));

    // Note: We don't finalize here anymore - that's done by finalizeAndGetUrl
    // This allows the caller to control when finalization happens

    // Combine all chunks into single blob
    const finalBlob =
      chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: 'video/webm' })
        : null;

    // Recording stopped - logging minimized for performance

    return finalBlob;
  }, []);

  /**
   * Add AI audio stream after recording has started
   * (useful when WebRTC connection completes after recording begins)
   */
  const addAiAudioStream = useCallback((stream: MediaStream) => {
    if (recorderRef.current) {
      recorderRef.current.addAiAudioStream(stream);
      // AI audio stream added - logging removed to prevent spam
    }
  }, []);

  /**
   * Get current recording chunks (for progressive upload)
   */
  const getChunks = useCallback((): Blob[] => {
    return [...chunksRef.current];
  }, []);

  /**
   * Wait for all pending uploads to complete
   */
  const waitForCompletion = useCallback(async () => {
    // Wait for upload queue to be empty and no uploads in progress
    const maxWaitMs = 30000; // 30 seconds max wait
    const startTime = Date.now();

    while (
      (uploadQueueRef.current.length > 0 ||
        pendingUploadsRef.current.size > 0 ||
        isUploadingRef.current) &&
      Date.now() - startTime < maxWaitMs
    ) {
      // eslint-disable-next-line no-console
      console.log('[Recording] Waiting for uploads to complete', {
        queueSize: uploadQueueRef.current.length,
        pendingCount: pendingUploadsRef.current.size,
        isUploading: isUploadingRef.current,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (
      uploadQueueRef.current.length > 0 ||
      pendingUploadsRef.current.size > 0
    ) {
      logger.warn({
        event: 'recording_wait_timeout',
        queueSize: uploadQueueRef.current.length,
        pendingCount: pendingUploadsRef.current.size,
      });
    }

    // eslint-disable-next-line no-console
    console.log('[Recording] All uploads complete');
  }, []);

  /**
   * Finalize recording and get the video URL
   */
  const finalizeAndGetUrl = useCallback(
    async (sessionId: string): Promise<string | null> => {
      try {
        // Wait for all uploads to complete
        await waitForCompletion();

        // Calculate total file size
        const totalSize = chunksRef.current.reduce(
          (sum, chunk) => sum + chunk.size,
          0
        );

        // Commit blocks to finalize the video
        // eslint-disable-next-line no-console
        console.log('[Recording] Finalizing video with block IDs', {
          blockCount: blockIdsRef.current.length,
          sessionId,
          totalSize,
        });

        const response = await fetch('/api/interview/finalize-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            blockIds: blockIdsRef.current,
            duration: recordingState.metadata?.durationMs || 0,
            fileSize: totalSize,
            videoFormat: 'video/webm',
            videoResolution: `${recordingState.metadata?.resolution.width || 1280}x${recordingState.metadata?.resolution.height || 720}`,
            frameRate: recordingState.metadata?.fpsTarget || 30,
          }),
        });

        if (!response.ok) {
          logger.error({
            event: 'finalize_upload_error',
            status: response.status,
            sessionId,
          });
          return null;
        }

        const data = await response.json();
        const videoUrl = data.value?.videoUrl || data.value?.url;

        // eslint-disable-next-line no-console
        console.log('[Recording] Video finalized', { videoUrl });

        // Clear refs after successful finalization
        blockIdsRef.current = [];
        pendingUploadsRef.current.clear();
        uploadQueueRef.current = [];
        isUploadingRef.current = false;

        return videoUrl;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown';
        logger.error({
          event: 'finalize_upload_exception',
          error: message,
          sessionId,
        });
        return null;
      }
    },
    [waitForCompletion, recordingState.metadata]
  );

  /**
   * Auto-start recording when enabled changes to true
   */
  useEffect(() => {
    if (enabled && autoStart && !recorderRef.current) {
      // Find the interview container
      const container = document.getElementById('interview-root');
      if (container) {
        startRecording(container);
      }
    }
  }, [enabled, autoStart, startRecording]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
    };
  }, []);

  return {
    ...recordingState,
    startRecording,
    stopRecording,
    addAiAudioStream,
    getChunks,
    waitForCompletion,
    finalizeAndGetUrl,
    isSupported: CompositeRecorder.isCompositeSupported(),
    progressiveUpload, // Expose progressive upload flag
  };
}
