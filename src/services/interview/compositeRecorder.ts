// EP5-S4: Canvas Composite Recording using element.captureStream()
// Captures interview UI directly from DOM element + mixed audio (candidate + AI)

import { logger } from '../../monitoring/logger';

export interface CompositeRecorderConfig {
  rootElement: HTMLElement; // interview root container
  localStream: MediaStream; // candidate audio + video
  aiAudioStream?: MediaStream; // remote AI audio
  fps?: number; // desired frame rate (default 30)
  chunkMs?: number; // MediaRecorder timeslice (default 1000 for progressive upload)
  mimeType?: string; // preferred mime type
  onChunk?: (_data: Blob, _index: number) => void;
  onMetadata?: (_meta: CompositeRecordingMetadata) => void;
  onError?: (_err: Error) => void;
}

export interface CompositeRecordingMetadata {
  resolution: { width: number; height: number };
  fpsTarget: number;
  hasWebcam: boolean;
  totalChunks: number;
  composite: boolean; // true if using captureStream, false if fallback
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export interface StartResult {
  stream: MediaStream; // composite stream being recorded
  mediaRecorder: MediaRecorder; // underlying recorder
}

export class CompositeRecorder {
  private cfg: CompositeRecorderConfig;
  private videoTrack?: MediaStreamTrack; // webcam video track if present
  private mixedAudioDest?: MediaStreamAudioDestinationNode;
  private audioCtx?: AudioContext;
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunkIndex = 0;
  private stopped = false;
  private startTime = 0;

  constructor(cfg: CompositeRecorderConfig) {
    this.cfg = {
      fps: 30,
      chunkMs: 1000,
      ...cfg,
    };
    this.videoTrack = cfg.localStream.getVideoTracks()[0];
  }

  /**
   * Check if element.captureStream() is supported
   */
  static isCompositeSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const testDiv = document.createElement('div');
    return (
      typeof (testDiv as unknown as { captureStream?: () => MediaStream })
        .captureStream === 'function'
    );
  }

  /**
   * Start recording with composite UI capture or fallback
   */
  start(): StartResult | null {
    if (!CompositeRecorder.isCompositeSupported()) {
      return this.startFallback();
    }

    try {
      // Use element.captureStream() to capture the root element directly
      const videoStream = (
        this.cfg.rootElement as unknown as {
          captureStream: (_fps: number) => MediaStream;
        }
      ).captureStream(this.cfg.fps!) as MediaStream;

      if (!videoStream) {
        logger.warn({ event: 'captureStream_returned_null' });
        return this.startFallback();
      }

      logger.info({
        event: 'composite_recording_using_captureStream',
        fps: this.cfg.fps,
      });

      // Mix audio: candidate mic + AI audio
      this.setupAudioMixing();

      // Combine video + mixed audio
      const compositeTracks: MediaStreamTrack[] = [
        ...videoStream.getVideoTracks(),
      ];

      if (this.mixedAudioDest) {
        const audioTrack = this.mixedAudioDest.stream.getAudioTracks()[0];
        if (audioTrack) compositeTracks.push(audioTrack);
      }

      this.stream = new MediaStream(compositeTracks);
      this.setupRecorder(this.stream, true);

      this.startTime = Date.now();

      return { stream: this.stream, mediaRecorder: this.recorder! };
    } catch (err) {
      logger.error({
        event: 'captureStream_failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return this.startFallback();
    }
  }

  /**
   * Fallback to webcam-only recording when captureStream unsupported
   * Note: element.captureStream() only works on canvas/video elements, not arbitrary HTML.
   * This is the expected path for most browsers when using a div container.
   */
  private startFallback(): StartResult | null {
    logger.info({
      event: 'composite_recording_using_webcam_fallback',
      reason:
        'captureStream not available for HTML elements (expected behavior)',
    });

    try {
      const fallbackTracks: MediaStreamTrack[] = [];

      // Use webcam video track if present
      if (this.videoTrack) {
        fallbackTracks.push(this.videoTrack);
      }

      // Mix audio anyway to ensure AI + user both captured
      this.setupAudioMixing();

      if (this.mixedAudioDest) {
        const mixTrack = this.mixedAudioDest.stream.getAudioTracks()[0];
        if (mixTrack) fallbackTracks.push(mixTrack);
      } else {
        // fallback to raw local audio
        const audioTrack = this.cfg.localStream.getAudioTracks()[0];
        if (audioTrack) fallbackTracks.push(audioTrack);
      }

      this.stream = new MediaStream(fallbackTracks);
      this.setupRecorder(this.stream, false);

      this.startTime = Date.now();

      return { stream: this.stream, mediaRecorder: this.recorder! };
    } catch (err) {
      this.cfg.onError?.(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }

  /**
   * Setup audio mixing: combine candidate mic + AI audio
   */
  private setupAudioMixing(): void {
    try {
      // Create audio context
      this.audioCtx = new AudioContext();
      const dest = this.audioCtx.createMediaStreamDestination();

      // Candidate microphone
      const micTrack = this.cfg.localStream.getAudioTracks()[0];
      if (micTrack) {
        const src = this.audioCtx.createMediaStreamSource(
          new MediaStream([micTrack])
        );
        const micGain = this.audioCtx.createGain();
        micGain.gain.value = 1.0; // baseline volume
        src.connect(micGain).connect(dest);
      }

      // AI audio (if available)
      if (this.cfg.aiAudioStream) {
        const aiTrack = this.cfg.aiAudioStream.getAudioTracks()[0];
        if (aiTrack) {
          const aiSrc = this.audioCtx.createMediaStreamSource(
            new MediaStream([aiTrack])
          );
          const aiGain = this.audioCtx.createGain();
          aiGain.gain.value = 0.85; // slight normalization to prevent clipping
          aiSrc.connect(aiGain).connect(dest);
        }
      }

      this.mixedAudioDest = dest;
      // Audio mixing complete - logging minimized for performance
    } catch (err) {
      logger.warn({
        event: 'composite_recording_audio_mixing_failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      this.mixedAudioDest = undefined;
    }
  }

  /**
   * Allow late injection of AI audio stream (after initial start)
   * Useful when WebRTC remote track arrives after recording has begun
   */
  addAiAudioStream(stream: MediaStream): void {
    this.cfg.aiAudioStream = stream;
    this.setupAudioMixing();

    // Replace existing audio track in composite stream
    if (this.stream && this.mixedAudioDest) {
      const newAudioTrack = this.mixedAudioDest.stream.getAudioTracks()[0];
      if (!newAudioTrack) return;

      const existingAudioTracks = this.stream.getAudioTracks();
      if (existingAudioTracks.length) {
        const oldTrack = existingAudioTracks[0];
        if (oldTrack) {
          this.stream.removeTrack(oldTrack);
        }
      }
      this.stream.addTrack(newAudioTrack);

      // Restart MediaRecorder if it's currently recording
      // This is necessary because MediaRecorder doesn't handle track changes gracefully
      if (this.recorder && this.recorder.state === 'recording') {
        const currentChunkIndex = this.chunkIndex;
        logger.info({
          event: 'composite_recording_restarting_for_audio_update',
          currentChunkIndex,
        });

        // eslint-disable-next-line no-console
        console.log(
          '[Recording] Restarting MediaRecorder to add AI audio',
          currentChunkIndex
        );

        // Temporarily disable onstop callback to prevent metadata emission during restart
        this.recorder.onstop = null;

        // Stop current recorder
        this.recorder.stop();

        // Wait a tick for the stop to complete, then restart
        setTimeout(() => {
          if (this.stream) {
            this.setupRecorder(
              this.stream,
              this.cfg.rootElement ? true : false
            );
            logger.info({
              event: 'composite_recording_restarted_after_audio_update',
              chunkIndex: this.chunkIndex,
            });
            // eslint-disable-next-line no-console
            console.log(
              '[Recording] MediaRecorder restarted, continuing with chunk index',
              { chunkIndex: this.chunkIndex }
            );
          }
        }, 100);
      }
    }
  }

  /**
   * Setup MediaRecorder with appropriate codec
   */
  private setupRecorder(stream: MediaStream, composite: boolean): void {
    // Try preferred mime type first, then fallback
    const mimeType = this.cfg.mimeType || this.selectBestMimeType();

    try {
      this.recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      });
    } catch {
      // Fallback to basic webm
      this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    }

    this.recorder.ondataavailable = ev => {
      if (ev.data && ev.data.size > 0) {
        this.chunkIndex++;
        this.cfg.onChunk?.(ev.data, this.chunkIndex);
      }
    };

    this.recorder.onstop = () => {
      const meta = this.buildMetadata(composite);
      this.cfg.onMetadata?.(meta);
    };

    this.recorder.onerror = e => {
      this.cfg.onError?.(e.error);
    };

    this.recorder.start(this.cfg.chunkMs);
    logger.info({
      event: 'composite_recording_started',
      composite,
      mimeType,
      fps: this.cfg.fps,
    });
  }

  /**
   * Select best available mime type
   */
  private selectBestMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];

    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return 'video/webm';
  }

  /**
   * Stop recording and cleanup
   */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    try {
      this.recorder?.stop();
    } catch (err) {
      logger.warn({
        event: 'composite_recording_stop_error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      });
    }

    // Close audio context
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => undefined);
    }

    logger.info({ event: 'composite_recording_stopped' });
  }

  /**
   * Build metadata for recording
   */
  private buildMetadata(composite: boolean): CompositeRecordingMetadata {
    // Get resolution from root element
    const resolution = {
      width: this.cfg.rootElement.offsetWidth || 1280,
      height: this.cfg.rootElement.offsetHeight || 720,
    };

    const endTime = Date.now();
    const durationMs = endTime - this.startTime;

    return {
      resolution,
      fpsTarget: this.cfg.fps || 30,
      hasWebcam: !!this.videoTrack,
      totalChunks: this.chunkIndex,
      composite,
      startTime: this.startTime,
      endTime,
      durationMs,
    };
  }

  /**
   * Get current recording state
   */
  getState(): string {
    return this.recorder?.state || 'inactive';
  }
}

// Helper: Check if composite recording is supported (for external use)
export function isCompositeSupported(): boolean {
  return CompositeRecorder.isCompositeSupported();
}
