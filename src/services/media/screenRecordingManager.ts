/**
 * Screen Recording Manager
 *
 * Records the full browser screen/tab using getDisplayMedia
 * Combined with user audio from microphone for complete interview recording
 */

export type ScreenRecordingState =
  | 'idle'
  | 'requesting-permissions'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export interface ScreenRecordingConfig {
  audio: {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    sampleRate?: number;
  };
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export interface ScreenRecordingCallbacks {
  onStateChange?: (_state: ScreenRecordingState) => void;
  onDataAvailable?: (_chunk: Blob) => void;
  onRecordingComplete?: (_blob: Blob) => void;
  onError?: (_error: Error) => void;
  onDurationUpdate?: (_durationMs: number) => void;
}

export class ScreenRecordingManager {
  private displayStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private state: ScreenRecordingState = 'idle';
  private config: ScreenRecordingConfig;
  private callbacks: ScreenRecordingCallbacks;
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;

  constructor(
    config?: Partial<ScreenRecordingConfig>,
    callbacks?: ScreenRecordingCallbacks
  ) {
    this.config = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        ...config?.audio,
      },
      mimeType: this.getSupportedMimeType(),
      videoBitsPerSecond: 5000000, // 5 Mbps for screen
      audioBitsPerSecond: 128000,
      ...config,
    };

    this.callbacks = callbacks || {};
  }

  /**
   * Get current recording state
   */
  getState(): ScreenRecordingState {
    return this.state;
  }

  /**
   * Request screen and audio permissions
   */
  async requestPermissions(): Promise<void> {
    this.setState('requesting-permissions');

    try {
      // Request screen capture (video only from display)
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser', // Prefer current tab
          frameRate: { ideal: 30 },
        },
        audio: false, // Don't capture system audio
      });

      // Request microphone for user audio
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: this.config.audio.echoCancellation,
          noiseSuppression: this.config.audio.noiseSuppression,
          autoGainControl: this.config.audio.autoGainControl,
          sampleRate: this.config.audio.sampleRate,
        },
      });

      // Combine display video with microphone audio
      this.combinedStream = new MediaStream();

      // Add video track from display
      this.displayStream.getVideoTracks().forEach(track => {
        this.combinedStream?.addTrack(track);
      });

      // Add audio track from microphone
      this.audioStream.getAudioTracks().forEach(track => {
        this.combinedStream?.addTrack(track);
      });

      // Handle user stopping share via browser UI
      this.displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.state === 'recording') {
          this.stopRecording();
        }
      });

      this.setState('ready');
    } catch (error) {
      const err = error as Error;
      let userMessage = err.message;

      if (err.name === 'NotAllowedError') {
        userMessage =
          'Screen sharing permission denied. Please allow screen sharing to record the interview.';
      } else if (err.name === 'NotFoundError') {
        userMessage = 'No screens available to capture.';
      } else if (err.name === 'AbortError') {
        userMessage = 'Screen sharing cancelled by user.';
      }

      this.handleError(new Error(userMessage));
      throw new Error(userMessage);
    }
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!this.combinedStream) {
      throw new Error(
        'Media streams not initialized. Call requestPermissions() first.'
      );
    }

    if (this.state === 'recording') {
      throw new Error('Already recording');
    }

    try {
      this.recordedChunks = [];
      this.startTime = Date.now();

      const options: MediaRecorderOptions = {
        mimeType: this.config.mimeType,
        videoBitsPerSecond: this.config.videoBitsPerSecond,
        audioBitsPerSecond: this.config.audioBitsPerSecond,
      };

      this.mediaRecorder = new MediaRecorder(this.combinedStream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event: Event) => {
        this.handleError(
          new Error(`MediaRecorder error: ${(event as ErrorEvent).message}`)
        );
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.setState('recording');
      this.startDurationTracking();
    } catch (error) {
      this.handleError(error as Error);
      throw new Error(`Failed to start recording: ${(error as Error).message}`);
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.mediaRecorder || this.state !== 'recording') {
      throw new Error('Not currently recording');
    }

    this.mediaRecorder.stop();
    this.stopDurationTracking();
    this.setState('stopped');
  }

  /**
   * Get recording duration in milliseconds
   */
  getDuration(): number {
    if (this.state === 'recording') {
      return Date.now() - this.startTime;
    } else if (this.state === 'stopped') {
      return this.startTime > 0 ? Date.now() - this.startTime : 0;
    }
    return 0;
  }

  /**
   * Get recorded blob
   */
  getRecordedBlob(): Blob | null {
    if (this.recordedChunks.length === 0) {
      return null;
    }

    return new Blob(this.recordedChunks, {
      type: this.config.mimeType || 'video/webm',
    });
  }

  /**
   * Get combined stream for preview
   */
  getCombinedStream(): MediaStream | null {
    return this.combinedStream;
  }

  /**
   * Release all resources
   */
  release(): void {
    this.stopDurationTracking();

    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Stop all tracks
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(track => track.stop());
      this.displayStream = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.setState('idle');
  }

  /**
   * Check browser support
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      'getDisplayMedia' in navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Get supported MIME types
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Handle recording stop
   */
  private handleRecordingStop(): void {
    const blob = this.getRecordedBlob();
    if (blob) {
      this.callbacks.onRecordingComplete?.(blob);
    }
  }

  /**
   * Start duration tracking
   */
  private startDurationTracking(): void {
    this.stopDurationTracking();

    this.durationInterval = setInterval(() => {
      const duration = this.getDuration();
      this.callbacks.onDurationUpdate?.(duration);
    }, 1000);
  }

  /**
   * Stop duration tracking
   */
  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Set state
   */
  private setState(state: ScreenRecordingState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.setState('error');
    this.callbacks.onError?.(error);
  }
}
