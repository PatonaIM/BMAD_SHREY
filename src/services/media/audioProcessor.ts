/**
 * Audio Processor Service
 *
 * Extracts audio from WebRTC MediaStream and converts it to PCM16 format
 * at 24kHz sample rate for OpenAI Realtime API compatibility.
 *
 * Features:
 * - Real-time audio extraction from MediaStream
 * - Float32 to PCM16 conversion
 * - Sample rate conversion (48kHz → 24kHz)
 * - Mono channel downmixing
 * - Audio buffering and chunking
 * - Level monitoring
 */

export interface AudioProcessorConfig {
  sampleRate: number; // Target sample rate (24000 for OpenAI)
  channels: number; // Target channels (1 for mono)
  bufferSize: number; // Audio buffer size in samples
}

export interface AudioProcessorCallbacks {
  onAudioData?: (_data: ArrayBuffer) => void;
  onAudioLevel?: (_level: number) => void;
  onError?: (_error: Error) => void;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private config: AudioProcessorConfig;
  private callbacks: AudioProcessorCallbacks;
  private isProcessing = false;
  private levelCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    config?: Partial<AudioProcessorConfig>,
    callbacks?: AudioProcessorCallbacks
  ) {
    this.config = {
      sampleRate: 24000, // OpenAI Realtime API requirement
      channels: 1, // Mono
      bufferSize: 4096, // Buffer size in samples
      ...config,
    };

    this.callbacks = callbacks || {};
  }

  /**
   * Initialize audio processor with MediaStream
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: 48000, // Native browser sample rate
      });

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create script processor for audio data extraction
      this.processorNode = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        1, // Input channels (mono)
        1 // Output channels (mono)
      );

      // Create analyser for level monitoring
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect nodes: source → analyser → processor
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // Setup audio processing
      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        this.processAudioBuffer(event);
      };

      this.isProcessing = true;

      // Start level monitoring
      this.startLevelMonitoring();
    } catch (error) {
      this.handleError(error as Error);
      throw new Error(
        `Failed to initialize audio processor: ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if processor is initialized and running
   */
  isActive(): boolean {
    return this.isProcessing && this.audioContext !== null;
  }

  /**
   * Get current audio level (0-1 range)
   */
  getCurrentLevel(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average / 255;
  }

  /**
   * Stop audio processing and release resources
   */
  stop(): void {
    this.isProcessing = false;

    // Stop level monitoring
    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }

    // Disconnect and cleanup nodes
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Process audio buffer and convert to PCM16
   */
  private processAudioBuffer(event: AudioProcessingEvent): void {
    if (!this.isProcessing) return;

    try {
      // Get input audio data (Float32Array)
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Get first channel (mono)

      // Resample from 48kHz to 24kHz
      const resampledData = this.resample(
        inputData,
        inputBuffer.sampleRate,
        this.config.sampleRate
      );

      // Convert Float32 to PCM16
      const pcm16Data = this.float32ToPCM16(resampledData);

      // Send processed audio data (ensure it's ArrayBuffer type)
      const arrayBuffer = new ArrayBuffer(pcm16Data.byteLength);
      const view = new Int16Array(arrayBuffer);
      view.set(pcm16Data);
      this.callbacks.onAudioData?.(arrayBuffer);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Resample audio data from source rate to target rate
   */
  private resample(
    inputData: Float32Array,
    sourceRate: number,
    targetRate: number
  ): Float32Array {
    if (sourceRate === targetRate) {
      return inputData;
    }

    const ratio = sourceRate / targetRate;
    const outputLength = Math.ceil(inputData.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      // Linear interpolation
      if (index + 1 < inputData.length) {
        const sample1 = inputData[index] ?? 0;
        const sample2 = inputData[index + 1] ?? 0;
        output[i] = sample1 + (sample2 - sample1) * fraction;
      } else {
        output[i] = inputData[index] ?? 0;
      }
    }

    return output;
  }

  /**
   * Convert Float32Array to PCM16 (Int16Array)
   */
  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const sample = float32Array[i] ?? 0;
      // Clamp to [-1, 1] range
      const clamped = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit integer
      pcm16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }

    return pcm16;
  }

  /**
   * Start monitoring audio levels
   */
  private startLevelMonitoring(): void {
    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
    }

    this.levelCheckInterval = setInterval(() => {
      if (this.isProcessing && this.callbacks.onAudioLevel) {
        const level = this.getCurrentLevel();
        this.callbacks.onAudioLevel(level);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.callbacks.onError?.(error);
  }

  /**
   * Create audio processor from MediaStream
   */
  static async createFromStream(
    stream: MediaStream,
    config?: Partial<AudioProcessorConfig>,
    callbacks?: AudioProcessorCallbacks
  ): Promise<AudioProcessor> {
    const processor = new AudioProcessor(config, callbacks);
    await processor.initialize(stream);
    return processor;
  }

  /**
   * Convert PCM16 to base64 (for OpenAI API)
   */
  static pcm16ToBase64(pcm16: ArrayBuffer): string {
    const bytes = new Uint8Array(pcm16);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCharCode(byte);
      }
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to PCM16
   */
  static base64ToPCM16(base64: string): Int16Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  /**
   * Play PCM16 audio data through browser audio context
   */
  static async playPCM16Audio(
    pcm16Data: Int16Array,
    sampleRate = 24000
  ): Promise<void> {
    const audioContext = new AudioContext({ sampleRate });
    const audioBuffer = audioContext.createBuffer(
      1, // Mono
      pcm16Data.length,
      sampleRate
    );

    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16Data.length; i++) {
      const sample = pcm16Data[i];
      if (sample !== undefined) {
        channelData[i] = sample / (sample < 0 ? 32768 : 32767);
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

    // Wait for audio to finish
    return new Promise(resolve => {
      source.onended = () => {
        audioContext.close();
        resolve();
      };
    });
  }

  /**
   * Calculate audio duration in seconds
   */
  static calculateDuration(sampleCount: number, sampleRate: number): number {
    return sampleCount / sampleRate;
  }

  /**
   * Check browser support for audio processing
   */
  static isSupported(): boolean {
    const windowWithWebkit = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    return !!(
      typeof AudioContext !== 'undefined' ||
      typeof windowWithWebkit.webkitAudioContext !== 'undefined'
    );
  }
}

/**
 * Audio Buffer Manager
 *
 * Manages buffering and chunking of audio data for transmission
 */
export class AudioBufferManager {
  private buffer: Int16Array[] = [];
  private maxBufferSize: number;
  private chunkSize: number;

  constructor(chunkSize = 4800, maxBufferSize = 10) {
    // 4800 samples = 200ms at 24kHz
    this.chunkSize = chunkSize;
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Add audio data to buffer
   */
  add(data: Int16Array): Int16Array[] {
    this.buffer.push(data);

    // Return ready chunks
    const chunks: Int16Array[] = [];

    while (this.getTotalSamples() >= this.chunkSize) {
      const chunk = this.extractChunk(this.chunkSize);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Prevent buffer overflow
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }

    return chunks;
  }

  /**
   * Get total samples in buffer
   */
  private getTotalSamples(): number {
    return this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  /**
   * Extract chunk of specified size from buffer
   */
  private extractChunk(size: number): Int16Array | null {
    if (this.getTotalSamples() < size) {
      return null;
    }

    const chunk = new Int16Array(size);
    let offset = 0;

    while (offset < size && this.buffer.length > 0) {
      const first = this.buffer[0];
      if (!first) break;

      const needed = size - offset;
      const available = first.length;

      if (available <= needed) {
        // Use entire first buffer
        chunk.set(first, offset);
        offset += available;
        this.buffer.shift();
      } else {
        // Use part of first buffer
        chunk.set(first.subarray(0, needed), offset);
        this.buffer[0] = first.subarray(needed);
        offset += needed;
      }
    }

    return chunk;
  }

  /**
   * Flush all buffered data
   */
  flush(): Int16Array | null {
    if (this.buffer.length === 0) {
      return null;
    }

    const totalSamples = this.getTotalSamples();
    const result = new Int16Array(totalSamples);
    let offset = 0;

    for (const chunk of this.buffer) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    this.buffer = [];
    return result;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get buffer size in samples
   */
  getBufferSize(): number {
    return this.getTotalSamples();
  }

  /**
   * Check if buffer has data
   */
  hasData(): boolean {
    return this.buffer.length > 0;
  }
}
