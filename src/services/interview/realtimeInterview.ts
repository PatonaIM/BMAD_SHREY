// EP5-S2: WebRTC + OpenAI Realtime integration scaffold (refactored)
// Focus: structural handshake + state updates + event exposure. Not production ready.

export interface RealtimeSessionState {
  phase: 'idle' | 'token' | 'connecting' | 'connected' | 'fallback' | 'error';
  error?: string;
  connectionState?: string;
  iceGatheringState?: string;
  latencyMs?: number; // Offer→Answer round-trip
  firstAudioFrameLatencyMs?: number; // Offer creation → first inbound track
  avgInboundAudioJitterMs?: number; // Rolling avg from getStats()
  iceRestartCount?: number;
  currentTurnActive?: boolean;
  currentQuestionIndex?: number;
  aiSpeaking?: boolean;
  lastEventTs?: number;
}

// Draft DataChannel event schema (EP5-S2)
export interface InterviewRTCEvent {
  type:
    | 'turn.start'
    | 'turn.end'
    | 'question.ready'
    | 'latency.ping'
    | 'error'
    | 'ai.state';
  ts: number; // epoch ms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

function parseInterviewRTCEvent(raw: unknown): InterviewRTCEvent | null {
  if (typeof raw === 'string') {
    try {
      const maybe = JSON.parse(raw);
      return parseInterviewRTCEvent(maybe);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw as any;
  if (typeof obj.type !== 'string' || typeof obj.ts !== 'number') return null;
  return {
    type: obj.type,
    ts: obj.ts,
    payload:
      obj.payload && typeof obj.payload === 'object' ? obj.payload : undefined,
  } as InterviewRTCEvent;
}

export interface EphemeralTokenResponse {
  token: string;
  sdpEndpoint: string;
}

export async function fetchEphemeralToken(
  applicationId: string
): Promise<EphemeralTokenResponse> {
  const res = await fetch(
    `/api/interview/ephemeral-token?applicationId=${encodeURIComponent(applicationId)}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  return res.json();
}

export interface RealtimeBootstrapOptions {
  applicationId: string;
  localStream: MediaStream;
  onState: (_state: RealtimeSessionState) => void;
  enableWebSocketFallback?: boolean;
}

export async function startRealtimeInterview(
  opts: RealtimeBootstrapOptions
): Promise<RTCPeerConnection | null> {
  const { applicationId, localStream, onState, enableWebSocketFallback } = opts;
  let current: RealtimeSessionState = { phase: 'idle', iceRestartCount: 0 };
  const update = (partial: Partial<RealtimeSessionState>) => {
    current = { ...current, ...partial };
    onState(current);
  };

  try {
    update({ phase: 'token' });
    const tokenResp = await fetchEphemeralToken(applicationId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) pc.addTrack(audioTrack, localStream);

    const controlChannel = pc.createDataChannel('control');
    controlChannel.onmessage = ev => {
      const parsed = parseInterviewRTCEvent(ev.data);
      if (parsed) {
        // Update session state based on event type
        const evtState: Partial<RealtimeSessionState> = {
          lastEventTs: parsed.ts,
        };
        switch (parsed.type) {
          case 'turn.start':
            evtState.currentTurnActive = true;
            break;
          case 'turn.end':
            evtState.currentTurnActive = false;
            break;
          case 'question.ready':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            evtState.currentQuestionIndex = (parsed.payload as any)?.idx;
            break;
          case 'ai.state':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            evtState.aiSpeaking = !!(parsed.payload as any)?.speaking;
            break;
          case 'error': {
            const payload = parsed.payload as { message?: string } | undefined;
            evtState.error = payload?.message || 'RTC event error';
            break;
          }
          default:
            break;
        }
        update(evtState);
        // Dispatch both generic and specific custom events
        window.dispatchEvent(
          new CustomEvent('interview:rtc_event', { detail: parsed })
        );
        window.dispatchEvent(
          new CustomEvent(`interview:rtc_${parsed.type.replace('.', '_')}`, {
            detail: parsed,
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent('interview:rtc_event', { detail: { raw: ev.data } })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      update({ connectionState: pc.connectionState });
      if (pc.connectionState === 'connected') update({ phase: 'connected' });
    };
    pc.onicegatheringstatechange = () => {
      update({ iceGatheringState: pc.iceGatheringState });
    };

    let offerCreatedAt: number | null = null;
    pc.ontrack = ev => {
      const inboundStream = ev.streams[0];
      if (!inboundStream) return;
      const w = window as unknown as {
        __interviewV2RemoteStream?: MediaStream;
      };
      const first = !w.__interviewV2RemoteStream;
      w.__interviewV2RemoteStream = inboundStream;
      if (first && offerCreatedAt) {
        update({
          firstAudioFrameLatencyMs: performance.now() - offerCreatedAt,
        });
      }
      window.dispatchEvent(new CustomEvent('interview:remote_stream_ready'));
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'disconnected' || state === 'failed') {
        if ((current.iceRestartCount ?? 0) < 3) {
          try {
            pc.restartIce();
            update({ iceRestartCount: (current.iceRestartCount ?? 0) + 1 });
          } catch {
            // ignore
          }
        }
      }
    };

    update({ phase: 'connecting' });
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    offerCreatedAt = performance.now();
    await pc.setLocalDescription(offer);

    const answerResp = await fetch(tokenResp.sdpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ephemeral-Token': tokenResp.token,
      },
      body: JSON.stringify({ sdp: offer.sdp, applicationId }),
    });
    if (!answerResp.ok)
      throw new Error(`SDP exchange failed: ${answerResp.status}`);
    const { answer } = await answerResp.json();
    const latencyMs = offerCreatedAt
      ? performance.now() - offerCreatedAt
      : undefined;
    update({ latencyMs });
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });

    setTimeout(() => {
      if (pc.connectionState !== 'connected') {
        if (enableWebSocketFallback) {
          update({ phase: 'fallback', connectionState: pc.connectionState });
          window.dispatchEvent(new CustomEvent('interview:webrtc_fallback'));
        } else {
          update({ phase: 'error', error: 'WebRTC negotiation timeout' });
        }
      }
    }, 8000);

    const statsInterval = setInterval(async () => {
      if (pc.connectionState !== 'connected') return;
      try {
        const stats = await pc.getStats();
        let jitterAccum = 0;
        let jitterCount = 0;
        stats.forEach(report => {
          if (
            report.type === 'inbound-rtp' &&
            report.kind === 'audio' &&
            typeof report.jitter === 'number'
          ) {
            jitterAccum += report.jitter * 1000; // seconds → ms
            jitterCount++;
          }
        });
        if (jitterCount) {
          update({
            avgInboundAudioJitterMs:
              Math.round((jitterAccum / jitterCount) * 100) / 100,
          });
        }
      } catch {
        // ignore
      }
    }, 5000);

    const originalClose = pc.close.bind(pc);
    pc.close = () => {
      clearInterval(statsInterval);
      originalClose();
    };

    return pc;
  } catch (err) {
    update({
      phase: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return null;
  }
}
