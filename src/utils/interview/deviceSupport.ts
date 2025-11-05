// Utility: Device & environment capability detection + lightweight network diagnostics
// EP5-S1

export interface DeviceSupportInfo {
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasWebRTC: boolean;
  hasWebSocket: boolean;
  browser: string;
  platform: string;
}

export interface NetworkDiagnosticsResult {
  latencyMs: number | null;
  classification: 'poor' | 'fair' | 'good' | 'unknown';
}

export function detectBrowserInterviewSupport(): DeviceSupportInfo {
  if (typeof window === 'undefined') {
    return {
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasWebRTC: false,
      hasWebSocket: false,
      browser: 'server',
      platform: 'server',
    };
  }
  const nav = navigator as Navigator;
  const ua = nav.userAgent || '';
  return {
    hasMediaDevices: typeof navigator.mediaDevices !== 'undefined',
    hasGetUserMedia:
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia === 'function',
    hasWebRTC: typeof RTCPeerConnection !== 'undefined',
    hasWebSocket: typeof WebSocket !== 'undefined',
    browser: detectBrowser(ua),
    platform: nav.platform || 'unknown',
  };
}

function detectBrowser(ua: string): string {
  if (/Chrome\//.test(ua) && !/Edge\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua)) return 'edge';
  return 'unknown';
}

export async function runNetworkDiagnostics(
  signalUrl?: string
): Promise<NetworkDiagnosticsResult> {
  if (typeof window === 'undefined') {
    return { latencyMs: null, classification: 'unknown' };
  }
  const start = performance.now();
  try {
    // Use a lightweight fetch to same-origin or provided signaling endpoint (HEAD preferred)
    const target = signalUrl || '/api/ping';
    await fetch(target, { method: 'GET', cache: 'no-store' });
    const latency = performance.now() - start;
    return { latencyMs: latency, classification: classifyLatency(latency) };
  } catch {
    return { latencyMs: null, classification: 'unknown' };
  }
}

function classifyLatency(ms: number): 'poor' | 'fair' | 'good' {
  if (ms < 120) return 'good';
  if (ms < 300) return 'fair';
  return 'poor';
}

// Simple audio level analyser
export function setupAudioLevelMeter(
  stream: MediaStream,
  onLevel: (_level: number) => void
): () => void {
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextCtor: typeof AudioContext =
    win.AudioContext || win.webkitAudioContext || AudioContext;
  const ctx = new AudioContextCtor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let mounted = true;

  function tick() {
    if (!mounted) return;
    analyser.getByteFrequencyData(data);
    // Approximate volume as average amplitude
    const arr: Uint8Array = data || new Uint8Array();
    const total = arr.reduce((acc, v) => acc + v, 0);
    const length = arr.length || 1;
    const avg = total / length; // 0-255
    const normalized = avg / 255; // 0-1
    onLevel(Number(normalized.toFixed(3)));
    setTimeout(tick, 100); // ~10Hz
  }
  tick();

  return () => {
    mounted = false;
    try {
      ctx.close();
    } catch {
      /* no-op */
    }
  };
}
