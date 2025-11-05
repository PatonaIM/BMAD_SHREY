// EP5-S4: Canvas Composite Recording (initial scaffold)
// Sequential Step: Design + initial implementation (interfaces, setup, draw loop, audio mix, fallback logic stubs).
// NOTE: Full DOM rendering requires html2canvas or similar; placeholder draws colored backdrop + PiP webcam.

export interface CompositeRecorderConfig {
  rootElement: HTMLElement; // interview root container
  localStream: MediaStream; // candidate audio (+ optional video track)
  aiAudioStream?: MediaStream; // remote AI audio
  targetResolutions?: Array<{ width: number; height: number }>; // descending order
  fps?: number; // desired frame rate (default 30)
  chunkMs?: number; // MediaRecorder timeslice (default 5000)
  encodeTimeThresholdMs?: number; // fallback trigger (avg draw+encode > threshold, default 25)
  onChunk?: (_data: Blob, _index: number) => void; // underscore unused
  onMetadata?: (_meta: CompositeRecordingMetadata) => void; // underscore unused
  onError?: (_err: Error) => void; // underscore unused
}

export interface CompositeRecordingMetadata {
  resolution: { width: number; height: number };
  fpsAvg: number;
  hasWebcam: boolean;
  totalChunks: number;
  composite: boolean; // false if fallback webcam-only
  downgraded: boolean;
}

export interface StartResult {
  stream: MediaStream; // composite stream actually recorded
  mediaRecorder: MediaRecorder; // underlying recorder
}

interface TimingSample {
  frameStart: number;
  frameEnd: number;
}

export class CompositeRecorder {
  private cfg: CompositeRecorderConfig;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D; // will never be null after start, guarded
  private videoTrack?: MediaStreamTrack; // webcam video track if present
  private mixedAudioDest?: MediaStreamAudioDestinationNode;
  private audioCtx?: AudioContext;
  private recorder?: MediaRecorder;
  private frameSamples: TimingSample[] = [];
  private frameCount = 0;
  private startTime = 0;
  private currentResIndex = 0;
  private stream?: MediaStream;
  private chunkIndex = 0;
  private stopped = false;
  private downgraded = false;

  constructor(cfg: CompositeRecorderConfig) {
    this.cfg = {
      targetResolutions: [
        { width: 1280, height: 720 },
        { width: 960, height: 540 },
        { width: 640, height: 360 },
      ],
      fps: 30,
      chunkMs: 5000,
      encodeTimeThresholdMs: 25,
      ...cfg,
    };
    this.videoTrack = cfg.localStream.getVideoTracks()[0];
  }

  start(): StartResult | null {
    if (!this.supportsComposite()) {
      return this.startFallback();
    }
    // Create canvas
    this.canvas = document.createElement('canvas');
    const res = this.cfg.targetResolutions && this.cfg.targetResolutions[0];
    if (!res) {
      return this.startFallback(new Error('No resolutions configured'));
    }
    this.canvas.width = res.width;
    this.canvas.height = res.height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return this.startFallback(new Error('2D context unavailable'));
    }
    this.ctx = ctx;

    // Audio mixing
    this.setupAudioMixing();

    const canvasStream = this.canvas.captureStream(this.cfg.fps!);
    const compositeTracks: MediaStreamTrack[] = [
      ...canvasStream.getVideoTracks(),
    ];
    if (this.mixedAudioDest) {
      const audioTrack = this.mixedAudioDest.stream.getAudioTracks()[0];
      if (audioTrack) compositeTracks.push(audioTrack);
    }
    this.stream = new MediaStream(compositeTracks);

    this.setupRecorder(this.stream, true);

    this.startTime = performance.now();
    this.frameCount = 0;
    this.loop();

    return { stream: this.stream, mediaRecorder: this.recorder! };
  }

  private supportsComposite(): boolean {
    return !!(
      HTMLCanvasElement && document.createElement('canvas').captureStream
    );
  }

  private startFallback(_reason?: Error): StartResult | null {
    // underscore unused

    try {
      const fallbackTracks: MediaStreamTrack[] = [];
      // Prefer webcam video track if present
      if (this.videoTrack) fallbackTracks.push(this.videoTrack);
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
      this.startTime = performance.now();
      return { stream: this.stream, mediaRecorder: this.recorder! };
    } catch (err) {
      this.cfg.onError?.(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }

  private setupAudioMixing(): void {
    try {
      // Recreate audio context if we are re-mixing (e.g., adding AI track post-start)
      if (this.audioCtx) {
        try {
          this.audioCtx.close();
        } catch {
          /* ignore */
        }
      }
      this.audioCtx = new AudioContext();
      const dest = this.audioCtx.createMediaStreamDestination();
      // Candidate mic
      const micTrack = this.cfg.localStream.getAudioTracks()[0];
      if (micTrack) {
        const src = this.audioCtx.createMediaStreamSource(
          new MediaStream([micTrack])
        );
        const micGain = this.audioCtx.createGain();
        micGain.gain.value = 1.0; // baseline
        src.connect(micGain).connect(dest);
      }
      // AI audio
      if (this.cfg.aiAudioStream) {
        const aiTrack = this.cfg.aiAudioStream.getAudioTracks()[0];
        if (aiTrack) {
          const aiSrc = this.audioCtx.createMediaStreamSource(
            new MediaStream([aiTrack])
          );
          const aiGain = this.audioCtx.createGain();
          aiGain.gain.value = 0.85; // slight normalization
          aiSrc.connect(aiGain).connect(dest);
        }
      }
      this.mixedAudioDest = dest;
    } catch {
      // Mixing failed; proceed without mixing
      this.mixedAudioDest = undefined;
    }
  }

  // Allow late injection of AI audio stream after recorder already started (WebRTC remote track arrives post-offer)
  addAiAudioStream(stream: MediaStream): void {
    this.cfg.aiAudioStream = stream;
    this.setupAudioMixing();
    // Replace existing audio track in composite stream if present
    if (this.stream && this.mixedAudioDest) {
      const newAudioTrack = this.mixedAudioDest.stream.getAudioTracks()[0];
      if (!newAudioTrack) return;
      const existingAudioTracks = this.stream.getAudioTracks();
      if (existingAudioTracks.length) {
        const oldTrack = existingAudioTracks[0];
        if (oldTrack) {
          try {
            this.stream.removeTrack(oldTrack);
          } catch {
            /* ignore */
          }
        }
      }
      this.stream.addTrack(newAudioTrack);
    }
  }

  private setupRecorder(stream: MediaStream, composite: boolean): void {
    try {
      this.recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
    } catch {
      // Fallback simpler mimeType
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
  }

  private loop = () => {
    if (this.stopped || !this.ctx || !this.canvas) return;
    const start = performance.now();
    const { width, height } = this.canvas;
    // Clear background
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, width, height);

    // Placeholder UI capture: draw a simple overlay representing root element identity
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, width, height - 100);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText(
      'INTERVIEW UI (placeholder – replace with html2canvas snapshot)',
      20,
      30
    );

    // PiP webcam
    if (this.videoTrack) {
      // We need a video element to draw frames from track
      const pipVideo = this.ensurePipVideo();
      if (pipVideo.readyState >= 2) {
        const pipW = Math.round(width * 0.25);
        const pipH = Math.round(height * 0.25);
        const pipX = width - pipW - 16;
        const pipY = height - pipH - 16;
        this.ctx.save();
        this.ctx.beginPath();
        const r = 12;
        this.roundRect(this.ctx, pipX, pipY, pipW, pipH, r);
        this.ctx.clip();
        this.ctx.drawImage(pipVideo, pipX, pipY, pipW, pipH);
        this.ctx.restore();
        // Border
        this.ctx.strokeStyle = '#00FFC8';
        this.ctx.lineWidth = 2;
        this.roundRect(this.ctx, pipX, pipY, pipW, pipH, r);
        this.ctx.stroke();
      }
    }

    const end = performance.now();
    this.frameCount++;
    this.frameSamples.push({ frameStart: start, frameEnd: end });
    if (this.frameSamples.length > 120) this.frameSamples.shift(); // keep last ~4 seconds

    // Resolution fallback check
    this.maybeDowngradeResolution();

    requestAnimationFrame(this.loop);
  };

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    try {
      this.recorder?.stop();
    } catch (e) {
      // swallow stop errors but log to console for diagnostics
      // eslint-disable-next-line no-console
      console.debug('CompositeRecorder stop error', e);
    }
    this.videoTrack = undefined;
    this.audioCtx?.close().catch(() => undefined);
  }

  private fpsAverage(): number {
    const elapsed = (performance.now() - this.startTime) / 1000;
    return elapsed > 0 ? this.frameCount / elapsed : 0;
  }

  private averageFrameCostMs(): number {
    if (!this.frameSamples.length) return 0;
    const sum = this.frameSamples.reduce(
      (acc, s) => acc + (s.frameEnd - s.frameStart),
      0
    );
    return sum / this.frameSamples.length;
  }

  private maybeDowngradeResolution(): void {
    if (
      !this.canvas ||
      this.currentResIndex >= this.cfg.targetResolutions!.length - 1
    )
      return;
    const avgCost = this.averageFrameCostMs();
    if (avgCost > this.cfg.encodeTimeThresholdMs!) {
      // Downgrade
      this.currentResIndex++;
      const res =
        this.cfg.targetResolutions &&
        this.cfg.targetResolutions[this.currentResIndex];
      if (res) {
        this.canvas.width = res.width;
        this.canvas.height = res.height;
      }
      this.downgraded = true;
    }
  }

  private buildMetadata(composite: boolean): CompositeRecordingMetadata {
    const res = this.canvas
      ? { width: this.canvas.width, height: this.canvas.height }
      : this.cfg.targetResolutions![this.currentResIndex] || {
          width: 0,
          height: 0,
        };
    return {
      resolution: res,
      fpsAvg: parseFloat(this.fpsAverage().toFixed(2)),
      hasWebcam: !!this.videoTrack,
      totalChunks: this.chunkIndex,
      composite,
      downgraded: this.downgraded,
    };
  }

  private ensurePipVideo(): HTMLVideoElement {
    let el = document.getElementById(
      'composite-pip-video'
    ) as HTMLVideoElement | null;
    if (!el) {
      el = document.createElement('video');
      el.id = 'composite-pip-video';
      el.playsInline = true;
      el.muted = true; // don't echo mic
      el.autoplay = true;
      el.style.position = 'fixed';
      el.style.left = '-9999px'; // hide offscreen
      const track = this.videoTrack!;
      el.srcObject = new MediaStream([track]);
      document.body.appendChild(el);
    }
    return el;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Helper downgrade decision for unit testing (exposed)
export function shouldDowngrade(
  avgFrameCostMs: number,
  thresholdMs: number
): boolean {
  return avgFrameCostMs > thresholdMs;
}

// Fallback decision helper for testing
export function shouldUseFallback(): boolean {
  return !('captureStream' in HTMLCanvasElement.prototype);
}
