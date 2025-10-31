/**
 * Video Recording Manager
 *
 * Handles WebRTC video+audio capture using MediaRecorder API
 * for interview recording and playback.
 *
 * Features:
 * - WebRTC getUserMedia for camera/mic access
 * - MediaRecorder for video+audio recording
 * - Configurable quality settings
 * - Chunk-based recording for reliability
 * - Recording lifecycle management
 */

export type RecordingState =
  | 'idle'
  | 'requesting-permissions'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export interface VideoRecordingConfig {
  video: {
    width?: number;
    height?: number;
    frameRate?: number;
    facingMode?: 'user' | 'environment';
  };
  audio: {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    sampleRate?: number;
  };
  mimeType?: string; // 'video/webm;codecs=vp9' or 'video/webm;codecs=vp8'
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export interface RecordingMetadata {
  duration: number; // milliseconds
  fileSize: number; // bytes
  mimeType: string;
  videoResolution: string; // '1280x720'
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  recordedAt: Date;
}

export interface RecordingCallbacks {
  onStateChange?: (_state: RecordingState) => void;
  onDataAvailable?: (_chunk: Blob) => void;
  onRecordingComplete?: (_blob: Blob, _metadata: RecordingMetadata) => void;
  onError?: (_error: Error) => void;
  onDurationUpdate?: (_durationMs: number) => void;
  onChunkReady?: (_chunk: Blob, _chunkIndex: number) => Promise<void>; // New callback for streaming
}

export class VideoRecordingManager {
  private mediaStream: MediaStream | null = null;
  private additionalAudioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private state: RecordingState = 'idle';
  private config: VideoRecordingConfig;
  private callbacks: RecordingCallbacks;
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private chunkIndex: number = 0; // Track chunk order for streaming

  constructor(
    config?: Partial<VideoRecordingConfig>,
    callbacks?: RecordingCallbacks
  ) {
    this.config = {
      video: {
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
        ...config?.video,
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        ...config?.audio,
      },
      mimeType: this.getSupportedMimeType(),
      videoBitsPerSecond: 2500000, // 2.5 Mbps
      audioBitsPerSecond: 128000, // 128 Kbps
      ...config,
    };

    this.callbacks = callbacks || {};
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.state === 'recording';
  }

  /**
   * Get current media stream
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Set media stream from an existing stream (e.g., from permission check)
   */
  setMediaStream(stream: MediaStream): void {
    this.mediaStream = stream;
    this.setState('ready');
  }

  /**
   * Add additional audio stream (e.g., AI interviewer audio) to be mixed with candidate audio
   * This should be called before startRecording()
   */
  setAdditionalAudioStream(audioStream: MediaStream): void {
    this.additionalAudioStream = audioStream;
  }

  /**
   * Create a combined stream with video from camera and mixed audio from both candidate and AI
   */
  private createCombinedStream(): MediaStream {
    if (!this.mediaStream) {
      throw new Error('Media stream not initialized');
    }

    // If no additional audio, just return the original stream
    if (!this.additionalAudioStream) {
      return this.mediaStream;
    }

    // Create audio context for mixing
    this.audioContext = new AudioContext();
    this.audioDestination = this.audioContext.createMediaStreamDestination();

    // Mix candidate audio
    const candidateAudioSource = this.audioContext.createMediaStreamSource(
      this.mediaStream
    );
    const candidateGain = this.audioContext.createGain();
    candidateGain.gain.value = 1.0; // Full volume for candidate
    candidateAudioSource.connect(candidateGain);
    candidateGain.connect(this.audioDestination);

    // Mix AI audio
    const aiAudioSource = this.audioContext.createMediaStreamSource(
      this.additionalAudioStream
    );
    const aiGain = this.audioContext.createGain();
    aiGain.gain.value = 0.8; // Slightly lower volume for AI to prioritize candidate
    aiAudioSource.connect(aiGain);
    aiGain.connect(this.audioDestination);

    // Create combined stream with video from camera and mixed audio
    const combinedStream = new MediaStream();

    // Add video track from camera
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    if (videoTrack) {
      combinedStream.addTrack(videoTrack);
    }

    // Add mixed audio track
    const mixedAudioTrack = this.audioDestination.stream.getAudioTracks()[0];
    if (mixedAudioTrack) {
      combinedStream.addTrack(mixedAudioTrack);
    }

    return combinedStream;
  }

  /**
   * Request camera and microphone permissions and initialize stream
   */
  async requestPermissions(): Promise<void> {
    this.setState('requesting-permissions');

    try {
      // Check if running on HTTPS (required for getUserMedia)
      if (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        throw new Error(
          'Camera/microphone access requires HTTPS connection (except on localhost)'
        );
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: this.config.video.width },
          height: { ideal: this.config.video.height },
          frameRate: { ideal: this.config.video.frameRate },
          facingMode: this.config.video.facingMode,
        },
        audio: {
          echoCancellation: this.config.audio.echoCancellation,
          noiseSuppression: this.config.audio.noiseSuppression,
          autoGainControl: this.config.audio.autoGainControl,
          sampleRate: this.config.audio.sampleRate,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.setState('ready');
    } catch (error) {
      const err = error as Error;

      // Provide more specific error messages
      let userMessage = err.message;
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        userMessage =
          'Permission denied. Please allow camera and microphone access in your browser settings.';
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        userMessage =
          'No camera or microphone found. Please connect a device and try again.';
      } else if (
        err.name === 'NotReadableError' ||
        err.name === 'TrackStartError'
      ) {
        userMessage =
          'Camera or microphone is already in use by another application. Please close other applications and try again.';
      } else if (err.name === 'OverconstrainedError') {
        userMessage =
          'Camera or microphone does not meet the required specifications. Try using a different device.';
      } else if (err.name === 'SecurityError') {
        userMessage =
          'Security error: Permissions blocked by browser policy or iframe settings.';
      } else if (err.name === 'TypeError') {
        userMessage =
          'Browser compatibility issue. Please use a modern browser like Chrome, Firefox, or Edge.';
      }

      this.handleError(new Error(userMessage));
      throw new Error(userMessage);
    }
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error(
        'Media stream not initialized. Call requestPermissions() first.'
      );
    }

    if (this.state === 'recording') {
      throw new Error('Already recording');
    }

    try {
      // Reset recorded chunks
      this.recordedChunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;
      this.chunkIndex = 0; // Reset chunk counter

      // Create combined stream with mixed audio
      this.combinedStream = this.createCombinedStream();

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: this.config.mimeType,
        videoBitsPerSecond: this.config.videoBitsPerSecond,
        audioBitsPerSecond: this.config.audioBitsPerSecond,
      };

      this.mediaRecorder = new MediaRecorder(this.combinedStream, options);

      // Setup event handlers
      this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);

          // If onChunkReady callback is provided, stream the chunk
          if (this.callbacks.onChunkReady) {
            try {
              await this.callbacks.onChunkReady(event.data, this.chunkIndex);
              this.chunkIndex++;
            } catch {
              // Continue recording even if chunk upload fails
              // Error will be logged by the callback handler
            }
          }
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

      // Start recording with 5-second chunks for streaming
      // Smaller chunks = more frequent uploads, less memory usage
      this.mediaRecorder.start(5000);
      this.setState('recording');

      // Start duration tracking
      this.startDurationTracking();
    } catch (error) {
      this.handleError(error as Error);
      throw new Error(`Failed to start recording: ${(error as Error).message}`);
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      throw new Error('Not currently recording');
    }

    this.mediaRecorder.pause();
    this.pauseStartTime = Date.now();
    this.setState('paused');
    this.stopDurationTracking();
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) {
      throw new Error('Recording not paused');
    }

    this.pausedDuration += Date.now() - this.pauseStartTime;
    this.mediaRecorder.resume();
    this.setState('recording');
    this.startDurationTracking();
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (
      !this.mediaRecorder ||
      (this.state !== 'recording' && this.state !== 'paused')
    ) {
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
      return Date.now() - this.startTime - this.pausedDuration;
    } else if (this.state === 'paused') {
      return this.pauseStartTime - this.startTime - this.pausedDuration;
    } else if (this.state === 'stopped') {
      return this.startTime > 0
        ? Date.now() - this.startTime - this.pausedDuration
        : 0;
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
   * Get the chunk index (useful for streaming uploads)
   */
  getChunkIndex(): number {
    return this.chunkIndex;
  }

  /**
   * Get total number of chunks recorded
   */
  getTotalChunks(): number {
    return this.recordedChunks.length;
  }

  /**
   * Release all resources
   */
  release(): void {
    // Stop duration tracking
    this.stopDurationTracking();

    // Stop recording if active
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.audioDestination = null;
    }

    // Release media streams
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    // Clear additional audio stream reference (don't stop it, as it's managed elsewhere)
    this.additionalAudioStream = null;

    // Clear state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.setState('idle');
  }

  /**
   * Check browser support for video recording
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && typeof MediaRecorder !== 'undefined');
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Get best supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = VideoRecordingManager.getSupportedMimeTypes();
    return types[0] || 'video/webm';
  }

  /**
   * Handle recording stop
   */
  private handleRecordingStop(): void {
    const blob = this.getRecordedBlob();
    if (!blob) {
      this.handleError(new Error('No recording data available'));
      return;
    }

    const duration = this.getDuration();
    const metadata: RecordingMetadata = {
      duration,
      fileSize: blob.size,
      mimeType: this.config.mimeType || 'video/webm',
      videoResolution: `${this.config.video.width}x${this.config.video.height}`,
      frameRate: this.config.video.frameRate || 30,
      videoBitrate: this.config.videoBitsPerSecond || 2500000,
      audioBitrate: this.config.audioBitsPerSecond || 128000,
      recordedAt: new Date(this.startTime),
    };

    this.callbacks.onRecordingComplete?.(blob, metadata);
  }

  /**
   * Start tracking duration
   */
  private startDurationTracking(): void {
    this.stopDurationTracking(); // Clear any existing interval

    this.durationInterval = setInterval(() => {
      const duration = this.getDuration();
      this.callbacks.onDurationUpdate?.(duration);
    }, 1000); // Update every second
  }

  /**
   * Stop tracking duration
   */
  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Set recording state
   */
  private setState(state: RecordingState): void {
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

  /**
   * Create object URL for preview
   */
  static createPreviewUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke object URL
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Download recording as file
   */
  static downloadRecording(
    blob: Blob,
    filename = 'interview-recording.webm'
  ): void {
    const url = VideoRecordingManager.createPreviewUrl(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    VideoRecordingManager.revokePreviewUrl(url);
  }

  /**
   * Get media devices (cameras and microphones)
   */
  static async getDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: devices.filter(d => d.kind === 'videoinput'),
      microphones: devices.filter(d => d.kind === 'audioinput'),
    };
  }

  /**
   * Test audio level (for microphone check)
   */
  static async testAudioLevel(
    stream: MediaStream,
    callback: (_level: number) => void,
    durationMs = 5000
  ): Promise<void> {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.fftSize = 256;
    microphone.connect(analyser);

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalized = average / 255; // 0-1 range
      callback(normalized);
    };

    const interval = setInterval(checkLevel, 100);

    setTimeout(() => {
      clearInterval(interval);
      microphone.disconnect();
      audioContext.close();
    }, durationMs);
  }
}
