/**
 * AudioLipSyncAnalyzer (ARKit-accurate)
 *
 * Real-time audio→viseme mapping tuned for Ready Player Me (ARKit blendshapes).
 * - True-Hz banding (not raw indices)
 * - RMS/centroid/flatness features
 * - Attack/Release smoothing
 * - ARKit-safe outputs (no mouthClose)
 */

export interface VisemeWeights {
  jawOpen?: number;
  mouthFunnel?: number;
  mouthPucker?: number;
  mouthSmile_L?: number;
  mouthSmile_R?: number;
  mouthPress_L?: number;
  mouthPress_R?: number;
  mouthLowerDown_L?: number;
  mouthLowerDown_R?: number;
  mouthUpperUp_L?: number;
  mouthUpperUp_R?: number;
  mouthDimple_L?: number;
  mouthDimple_R?: number;
}

type Blendshape =
  | 'jawOpen'
  | 'mouthFunnel'
  | 'mouthPucker'
  | 'mouthSmile_L'
  | 'mouthSmile_R'
  | 'mouthPress_L'
  | 'mouthPress_R'
  | 'mouthLowerDown_L'
  | 'mouthLowerDown_R'
  | 'mouthUpperUp_L'
  | 'mouthUpperUp_R'
  | 'mouthDimple_L'
  | 'mouthDimple_R';

export class AudioLipSyncAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isDisposed = false;

  // Smoothing
  private attack = 0.75; // rise speed (faster for more pronounced movements)
  private release = 0.25; // fall speed (faster decay)
  private previous: Partial<Record<Blendshape, number>> = {};

  // Adaptive noise gate
  private noiseFloor = 20;
  private gateHoldMs = 120;
  private lastVoiceTime = 0;

  // Debug
  private debug = false;
  private lastLog = 0;

  constructor(private fftSize = 512) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.7;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);
    // eslint-disable-next-line no-console
    console.log(
      '[LipSync] Init. fftSize=%d, bins=%d',
      fftSize,
      this.analyser.frequencyBinCount
    );
  }

  connectStream(stream: MediaStream) {
    if (!this.audioContext || !this.analyser)
      throw new Error('Audio not initialized');
    if (this.source) this.source.disconnect();

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    if (this.audioContext.state === 'suspended') {
      this.audioContext
        .resume()
        // eslint-disable-next-line no-console
        .catch(e => console.warn('[LipSync] resume failed', e));
    }
  }

  setDebug(enabled: boolean) {
    this.debug = !!enabled;
  }

  getVisemeWeights(): VisemeWeights {
    if (this.isDisposed || !this.analyser || !this.freqData || !this.timeData) {
      return this.neutral();
    }

    // Pull fresh data
    // @ts-expect-error WebAudio typing
    this.analyser.getByteFrequencyData(this.freqData);
    // @ts-expect-error WebAudio typing
    this.analyser.getByteTimeDomainData(this.timeData);

    const sampleRate = this.audioContext!.sampleRate;

    // ---------- Core features ----------
    const rms = this.getRMS(this.timeData);
    const centroid = this.getSpectralCentroid(this.freqData, sampleRate);
    const flatness = this.getSpectralFlatness(this.freqData);

    // Bark-ish bands (Hz)
    const e125_300 = this.bandEnergy(125, 300, sampleRate); // pitch & F1 low
    const e300_800 = this.bandEnergy(300, 800, sampleRate); // F1 region
    const e800_2000 = this.bandEnergy(800, 2000, sampleRate); // F2 region
    const e3k_8k = this.bandEnergy(3000, 8000, sampleRate); // sibilants/air

    // Normalize bands to 0..1 using adaptive scaling
    const norm = (x: number, a: number, b: number) =>
      Math.max(0, Math.min(1, (x - a) / (b - a)));
    const vEnergy = norm(rms, 0.01, 0.08); // more sensitive (lowered upper threshold)
    const sibilant = norm(e3k_8k, 8, 35); // more sensitive
    const f1 = norm(e300_800 + e125_300 * 0.5, 8, 45); // more sensitive
    const f2 = norm(e800_2000, 6, 40); // more sensitive
    const voiceLikely = vEnergy > 0.05 && flatness < 0.7; // lower threshold

    // Gate with hold (prevents chatter in silence)
    const now = performance.now();
    if (voiceLikely) this.lastVoiceTime = now;
    const gated = voiceLikely || now - this.lastVoiceTime < this.gateHoldMs;

    if (!gated) {
      // Slowly decay to neutral
      return this.smooth(this.neutral());
    }

    // ---------- Heuristics (viseme intent) ----------
    // Ratios to differentiate vowels/consonants
    const f2OverF1 = f1 > 0.001 ? f2 / (f1 + 1e-6) : 0;

    // Base weights bucket
    const w: Record<Blendshape, number> = {
      jawOpen: 0,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthSmile_L: 0,
      mouthSmile_R: 0,
      mouthPress_L: 0,
      mouthPress_R: 0,
      mouthLowerDown_L: 0,
      mouthLowerDown_R: 0,
      mouthUpperUp_L: 0,
      mouthUpperUp_R: 0,
      mouthDimple_L: 0,
      mouthDimple_R: 0,
    };

    // --- AA/AH (open) ---
    // strong low+F1 energy, not noisy
    const openVowel = Math.max(0, f1 * (1 - sibilant) * vEnergy);
    w.jawOpen = this.scale(openVowel, 0.1, 0.8) * 1.3; // amplified
    w.mouthLowerDown_L = w.jawOpen * 0.65;
    w.mouthLowerDown_R = w.jawOpen * 0.65;

    // --- EE (spread/smile) ---
    // F2 >> F1 and not noisy
    const ee =
      this.scale((f2OverF1 - 0.5) * vEnergy, 0.0, 0.7) * (1 - sibilant);
    w.mouthSmile_L = Math.max(w.mouthSmile_L || 0, ee * 1.1); // amplified
    w.mouthSmile_R = Math.max(w.mouthSmile_R || 0, ee * 1.1);

    // --- OO/WQ (pucker) ---
    // low F2 relative to F1, rounded mouth
    const oo =
      this.scale((f1 - f2 * 0.7) * vEnergy, 0.03, 0.7) * (1 - sibilant);
    w.mouthPucker = Math.max(w.mouthPucker || 0, oo * 1.1); // amplified
    w.mouthFunnel = Math.max(w.mouthFunnel || 0, oo * 0.75);

    // --- FV/TH (fricatives) ---
    // sibilant air noise but not super high centroid (FV/TH have lower hiss than S)
    const fv = this.scale(
      sibilant * (centroid < 4500 ? 1 : 0.5) * vEnergy,
      0.1,
      0.8
    );
    w.mouthFunnel = Math.max(w.mouthFunnel || 0, fv * 0.65); // amplified
    w.mouthDimple_L = Math.max(w.mouthDimple_L || 0, fv * 0.45);
    w.mouthDimple_R = Math.max(w.mouthDimple_R || 0, fv * 0.45);

    // --- S/Z/SH (sibilants) ---
    // strong high-band noise; keep jaw mainly closed, slight smile tension
    const sibil = this.scale(sibilant * vEnergy, 0.15, 0.85);
    w.jawOpen = Math.min(w.jawOpen || 0, 0.3 + (1 - sibil) * 0.4); // resist opening on hiss
    w.mouthSmile_L = Math.max(w.mouthSmile_L || 0, sibil * 0.35);
    w.mouthSmile_R = Math.max(w.mouthSmile_R || 0, sibil * 0.35);

    // --- MBP (lip closure) ---
    // low centroid, voiced, low sibilance → drive lip press (no ARKit "mouthClose")
    const mbp = this.scale(
      vEnergy * (1 - sibilant) * (centroid < 1800 ? 1 : 0),
      0.08,
      0.7
    );
    w.mouthPress_L = Math.max(w.mouthPress_L || 0, mbp * 1.15); // amplified
    w.mouthPress_R = Math.max(w.mouthPress_R || 0, mbp * 1.15);
    if (mbp > 0.35) {
      w.jawOpen = (w.jawOpen || 0) * 0.35; // keep lips together
    }

    // Limit conflicts: pucker vs smile
    const antagonistic = (a: Blendshape[], b: Blendshape[], t = 1) => {
      const aMax = Math.max(...a.map(k => w[k] || 0));
      const bMax = Math.max(...b.map(k => w[k] || 0));
      if (aMax > 0 && bMax > 0) {
        const damp = Math.min(1, (aMax + bMax) * 0.6 * t);
        a.forEach(k => (w[k] = w[k]! * (1 - damp * (bMax / (aMax + 1e-6)))));
        b.forEach(k => (w[k] = w[k]! * (1 - damp * (aMax / (bMax + 1e-6)))));
      }
    };
    antagonistic(
      ['mouthPucker', 'mouthFunnel'],
      ['mouthSmile_L', 'mouthSmile_R']
    );

    // Clamp and smooth
    (Object.keys(w) as Blendshape[]).forEach(
      k => (w[k] = this.clamp01(w[k] || 0))
    );
    return this.smooth(w);
  }

  // ---------- DSP helpers ----------
  private getRMS(time: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < time.length; i++) {
      const sample = time[i];
      if (sample !== undefined) {
        const v = (sample - 128) / 128; // [-1,1]
        sum += v * v;
      }
    }
    return Math.sqrt(sum / time.length);
  }

  private getSpectralCentroid(freq: Uint8Array, sampleRate: number): number {
    const binHz = sampleRate / this.analyser!.fftSize;
    let num = 0,
      den = 0;
    for (let i = 0; i < freq.length; i++) {
      const mag = freq[i];
      if (mag !== undefined) {
        num += i * binHz * mag;
        den += mag;
      }
    }
    return den > 0 ? num / den : 0;
  }

  private getSpectralFlatness(freq: Uint8Array): number {
    // geometric mean / arithmetic mean
    let g = 0,
      a = 0;
    const n = freq.length;
    for (let i = 0; i < n; i++) {
      const val = freq[i];
      if (val !== undefined) {
        const x = Math.max(1e-6, val);
        g += Math.log(x);
        a += x;
      }
    }
    const geo = Math.exp(g / n);
    const ari = a / n;
    return this.clamp01(geo / (ari + 1e-9));
  }

  private bandEnergy(
    hzLow: number,
    hzHigh: number,
    sampleRate: number
  ): number {
    const binHz = sampleRate / this.analyser!.fftSize;
    const start = Math.max(0, Math.floor(hzLow / binHz));
    const end = Math.min(this.freqData!.length - 1, Math.ceil(hzHigh / binHz));
    let sum = 0;
    const n = Math.max(1, end - start);
    for (let i = start; i < end; i++) {
      const val = this.freqData![i];
      if (val !== undefined) {
        sum += val;
      }
    }
    return sum / n;
  }

  // ---------- Shaping ----------
  private scale(x: number, inMin: number, inMax: number): number {
    if (inMax <= inMin) return 0;
    return this.clamp01((x - inMin) / (inMax - inMin));
  }

  private clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }

  private smooth(target: Partial<Record<Blendshape, number>>): VisemeWeights {
    const out: Partial<Record<Blendshape, number>> = {};

    (Object.keys(target) as Blendshape[]).forEach(k => {
      const prev = this.previous[k] || 0;
      const curr = target[k] || 0;
      const rising = curr > prev;
      const factor = rising ? this.attack : this.release;
      out[k] = prev + (curr - prev) * factor;
    });

    this.previous = out;
    return out as VisemeWeights;
  }

  private neutral() {
    // Neutral: relaxed lips, closed jaw
    const result: Partial<Record<Blendshape, number>> = {
      jawOpen: 0,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthSmile_L: 0,
      mouthSmile_R: 0,
      mouthPress_L: 0,
      mouthPress_R: 0,
      mouthLowerDown_L: 0,
      mouthLowerDown_R: 0,
      mouthUpperUp_L: 0,
      mouthUpperUp_R: 0,
      mouthDimple_L: 0,
      mouthDimple_R: 0,
    };
    return result;
  }

  getState() {
    return {
      contextState: this.audioContext?.state ?? null,
      isConnected: this.source !== null,
      isDisposed: this.isDisposed,
    };
  }

  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[LipSync] AudioContext resumed'); // eslint-disable-line no-console
    }
  }

  dispose() {
    if (this.isDisposed) return;
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
      this.audioContext?.close();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[LipSync] dispose error', e);
    }
    this.source = null;
    this.analyser = null;
    this.audioContext = null;
    this.freqData = null;
    this.timeData = null;
    this.previous = {};
    this.isDisposed = true;
  }
}
