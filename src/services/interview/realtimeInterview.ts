// EP5-S2: WebRTC + OpenAI Realtime integration scaffold (refactored)
// Focus: structural handshake + state updates + event exposure. Not production ready.

export interface RealtimeSessionState {
  // WebRTC session lifecycle phase
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
  // Interview journey phases (EP5 user journey extension)
  interviewPhase?:
    | 'pre_start'
    | 'intro'
    | 'conducting'
    | 'scoring'
    | 'completed';
  finalScore?: number; // 0..100 once completed
  // Adaptive context fields (populated when assembling next question)
  difficultyTier?: number;
  contextFragments?: Array<{
    id: string;
    kind: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [k: string]: any;
  }>;
  missingSkills?: string[];
}

// Draft DataChannel event schema (EP5-S2)
export interface InterviewRTCEvent {
  type:
    | 'turn.start'
    | 'turn.end'
    | 'question.ready'
    | 'latency.ping'
    | 'error'
    | 'ai.state'
    | 'interview.greet' // AI greeting & introduction request
    | 'interview.score' // AI finished scoring
    | 'interview.done'; // explicit completion signal
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
  token: {
    value: string;
    expires_at: number | null;
  };
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
  // Context assembler configuration
  jobProfile?: {
    requiredSkills: string[];
    roleType: 'technical' | 'mixed' | 'nontechnical';
  };
  maxContextTokens?: number; // default 1200
  initialDifficultyTier?: number; // default 3
  autoStartInterview?: boolean; // default false now (manual start button triggers greet)
}

export interface RealtimeInterviewHandles {
  pc: RTCPeerConnection;
  controlChannel: RTCDataChannel;
}

import { assembleContext } from './contextAssembler';
export async function startRealtimeInterview(
  opts: RealtimeBootstrapOptions
): Promise<RealtimeInterviewHandles | null> {
  const {
    applicationId,
    localStream,
    onState,
    enableWebSocketFallback,
    jobProfile,
    maxContextTokens = 1200,
    initialDifficultyTier = 3,
  } = opts;
  let current: RealtimeSessionState = {
    phase: 'idle',
    iceRestartCount: 0,
    interviewPhase: 'pre_start',
    difficultyTier: initialDifficultyTier,
  };
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
    controlChannel.onopen = () => {
      window.dispatchEvent(new CustomEvent('interview:control_channel_open'));
      console.log('[Interview] control channel opened');
    };
    controlChannel.onmessage = ev => {
      console.log('[Interview] control channel message received', ev.data);
      const parsed = parseInterviewRTCEvent(ev.data);
      if (parsed) {
        // Update session state based on event type
        const evtState: Partial<RealtimeSessionState> = {
          lastEventTs: parsed.ts,
        };
        Object.assign(evtState, applyInterviewRTCEvent(current, parsed));
        // Invoke context assembler only when entering or during conducting phase on question.ready events
        if (
          parsed.type === 'question.ready' &&
          (current.interviewPhase === 'conducting' ||
            evtState.interviewPhase === 'conducting') &&
          jobProfile
        ) {
          try {
            const context = assembleContext({
              answers: [], // TODO: populate with real AnswerEvaluation history
              job: jobProfile,
              currentDifficultyTier:
                current.difficultyTier ?? initialDifficultyTier,
              maxTokens: maxContextTokens,
            });
            evtState.difficultyTier = context.newDifficultyTier;
            evtState.contextFragments = context.fragments as Array<{
              id: string;
              kind: string;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [k: string]: any;
            }>;
            evtState.missingSkills = context.missingSkills;
            window.dispatchEvent(
              new CustomEvent('interview:context_ready', { detail: context })
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Context assembly failed', e);
          }
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
      if (pc.connectionState === 'connected') {
        update({ phase: 'connected' });
      }
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
        'X-Ephemeral-Token': tokenResp.token.value,
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

    return { pc, controlChannel };
  } catch (err) {
    update({
      phase: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return null;
  }
}

// Client side helpers to drive interview journey
function sendWhenOpen(
  control: RTCDataChannel,
  payload: Record<string, unknown>,
  attempts = 0
): void {
  if (control.readyState === 'open') {
    control.send(JSON.stringify(payload));
    return;
  }
  if (attempts > 40) {
    // give up after ~4s (100ms * 40)
    // eslint-disable-next-line no-console
    console.warn('DataChannel not open, abandoning send', payload.type);
    return;
  }
  setTimeout(() => sendWhenOpen(control, payload, attempts + 1), 100);
}

export function sendInterviewStart(control: RTCDataChannel): void {
  sendWhenOpen(control, {
    type: 'client.start',
    ts: Date.now(),
    payload: { note: 'begin_intro' },
  });
}

export function requestInterviewScore(control: RTCDataChannel): void {
  sendWhenOpen(control, {
    type: 'client.request_score',
    ts: Date.now(),
    payload: { breakdownRequested: true },
  });
}

// Pure state transition helper (exported for unit testing)
export function applyInterviewRTCEvent(
  prev: RealtimeSessionState,
  evt: InterviewRTCEvent
): Partial<RealtimeSessionState> {
  const partial: Partial<RealtimeSessionState> = {};
  switch (evt.type) {
    case 'turn.start':
      partial.currentTurnActive = true;
      break;
    case 'turn.end':
      partial.currentTurnActive = false;
      break;
    case 'question.ready': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      partial.currentQuestionIndex = (evt.payload as any)?.idx;
      if (prev.interviewPhase === 'intro') {
        partial.interviewPhase = 'conducting';
      }
      break;
    }
    case 'ai.state': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      partial.aiSpeaking = !!(evt.payload as any)?.speaking;
      break;
    }
    case 'interview.greet': {
      partial.interviewPhase = 'intro';
      break;
    }
    case 'interview.score': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const score = (evt.payload as any)?.score;
      if (typeof score === 'number') partial.finalScore = score;
      partial.interviewPhase = 'completed';
      break;
    }
    case 'interview.done': {
      partial.interviewPhase = 'completed';
      break;
    }
    case 'error': {
      const payload = evt.payload as { message?: string } | undefined;
      partial.error = payload?.message || 'RTC event error';
      break;
    }
    default:
      break;
  }
  return partial;
}
