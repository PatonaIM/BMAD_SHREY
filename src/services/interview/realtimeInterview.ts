// EP5-S2: WebRTC + OpenAI Realtime integration scaffold (refactored)
// Focus: structural handshake + state updates + event exposure. Not production ready.

export interface FinalScoreBreakdown {
  clarity: number;
  correctness: number;
  depth: number;
}

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
  finalScoreBreakdown?: FinalScoreBreakdown;
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

  // Buffers for accumulating tool call argument deltas
  const toolCallBuffers: Record<string, { name?: string; args: string }> = {};

  try {
    update({ phase: 'token' });
    const tokenResp = await fetchEphemeralToken(applicationId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) pc.addTrack(audioTrack, localStream);

    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1';
    const controlChannel = pc.createDataChannel('control');
    controlChannel.onopen = () => {
      window.dispatchEvent(new CustomEvent('interview:control_channel_open'));
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn('[Interview DEBUG] control channel opened');
      }
    };
    controlChannel.onmessage = ev => {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Interview DEBUG] control channel message received',
          ev.data
        );
      }
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
        // Attempt to parse OpenAI Realtime tool call streaming events
        try {
          const maybe = JSON.parse(ev.data);
          if (maybe && typeof maybe === 'object') {
            const m = maybe as {
              type?: string;
              id?: string;
              tool_call_id?: string;
              name?: string;
              delta?: { arguments?: string };
            };
            switch (m.type) {
              case 'response.output_tool_call.delta': {
                // Streaming arguments for a tool call
                // shape may include: { type, tool_call_id, name?, delta: { arguments?: '...' } }
                const toolId: string | undefined = m.tool_call_id;
                if (toolId) {
                  if (!toolCallBuffers[toolId]) {
                    toolCallBuffers[toolId] = { name: m.name, args: '' };
                  }
                  if (m.name) {
                    toolCallBuffers[toolId].name = m.name;
                  }
                  const deltaArgs = m.delta?.arguments;
                  if (deltaArgs) {
                    toolCallBuffers[toolId].args += String(deltaArgs);
                  }
                }
                break;
              }
              case 'response.output_tool_call.done':
              case 'response.tool_call.completed': {
                const toolId: string | undefined = m.tool_call_id;
                if (toolId && toolCallBuffers[toolId]) {
                  const { name, args } = toolCallBuffers[toolId];
                  delete toolCallBuffers[toolId];
                  let parsedArgs: Record<string, unknown> | undefined;
                  if (args.trim()) {
                    try {
                      parsedArgs = JSON.parse(args);
                    } catch {
                      /* ignore malformed args */
                    }
                  }
                  // Map tool name to interview event type
                  const map: Record<string, InterviewRTCEvent['type']> = {
                    interview_greet: 'interview.greet',
                    question_ready: 'question.ready',
                    interview_score: 'interview.score',
                    interview_done: 'interview.done',
                  };
                  const evtType = name ? map[name] : undefined;
                  if (evtType) {
                    const evt: InterviewRTCEvent = {
                      type: evtType,
                      ts: Date.now(),
                      payload: parsedArgs,
                    };
                    const evtState: Partial<RealtimeSessionState> = {
                      lastEventTs: evt.ts,
                    };
                    Object.assign(
                      evtState,
                      applyInterviewRTCEvent(current, evt)
                    );
                    update(evtState);
                    window.dispatchEvent(
                      new CustomEvent('interview:rtc_event', { detail: evt })
                    );
                    window.dispatchEvent(
                      new CustomEvent(
                        `interview:rtc_${evt.type.replace('.', '_')}`,
                        { detail: evt }
                      )
                    );
                  }
                }
                break;
              }
              default:
                break;
            }
          }
        } catch {
          // ignore non-JSON control payloads
        }
        window.dispatchEvent(
          new CustomEvent('interview:rtc_event', { detail: { raw: ev.data } })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      update({ connectionState: pc.connectionState });
      if (pc.connectionState === 'connected') {
        update({ phase: 'connected' });
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.warn('[Interview DEBUG] RTCPeerConnection connected');
        }
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
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(
            '[Interview DEBUG] first remote audio frame latency recorded'
          );
        }
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

    // Explicitly add a recvonly audio transceiver to ensure an audio m= section
    // Modern browsers increasingly rely on transceivers instead of deprecated
    // offerToReceive* constraints for consistent remote media negotiation.
    try {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } catch {
      /* ignore – older browsers may not support */
    }
    const offer = await pc.createOffer({
      offerToReceiveAudio: true, // kept for backward compatibility
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

    // Diagnostic: log if answer SDP lacks audio
    if (DEBUG && !answer.includes('m=audio')) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Interview DEBUG] Remote SDP answer has no m=audio section. ' +
          'Audio may not be negotiated via WebRTC. Check if model supports audio over WebRTC or if separate WebSocket is needed.'
      );
    }

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
        let inboundAudioPackets = 0;
        stats.forEach(report => {
          if (
            report.type === 'inbound-rtp' &&
            report.kind === 'audio' &&
            typeof report.jitter === 'number'
          ) {
            jitterAccum += report.jitter * 1000; // seconds → ms
            jitterCount++;
            // Check if we're actually receiving audio packets
            if (typeof report.packetsReceived === 'number') {
              inboundAudioPackets = report.packetsReceived;
            }
          }
        });
        if (jitterCount) {
          update({
            avgInboundAudioJitterMs:
              Math.round((jitterAccum / jitterCount) * 100) / 100,
          });
        }
        // Debug: log if no audio packets are being received
        if (DEBUG && inboundAudioPackets === 0) {
          // eslint-disable-next-line no-console
          console.warn(
            '[Interview DEBUG] Connected but no inbound audio packets received yet. Check if remote peer is sending audio.'
          );
        } else if (DEBUG && inboundAudioPackets > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `[Interview DEBUG] Receiving audio: ${inboundAudioPackets} packets`
          );
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
  // OpenAI Realtime API rejects unknown event types like 'client.start'.
  // We map our control intent into a supported pair of events:
  // 1. conversation.item.create (user message with sentinel)
  // 2. response.create (ask model to generate)
  const ts = Date.now();
  const itemId = `ctl_start_${ts}`;
  const createEvent = {
    type: 'conversation.item.create',
    item: {
      id: itemId,
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[CONTROL client.start] Candidate is ready. Greet and request introduction.',
        },
      ],
    },
  };
  // Request both text and audio so the model produces an audible greeting.
  // If the server side / token model does not support audio, the track simply won't arrive.
  const responseEvent = {
    type: 'response.create',
    response: {
      conversation: 'auto',
      // OpenAI Realtime models accept modalities and audio config.
      // These fields are ignored if unsupported.
      modalities: ['text', 'audio'],
      audio: {
        voice: 'alloy', // fallback voice name; adjust if your deployment differs
        format: 'pcm16',
      },
    },
  } as const;
  sendWhenOpen(control, createEvent);
  // slight delay to ensure ordering
  setTimeout(() => sendWhenOpen(control, responseEvent), 40);
}

export function requestInterviewScore(control: RTCDataChannel): void {
  const ts = Date.now();
  const itemId = `ctl_score_${ts}`;
  const createEvent = {
    type: 'conversation.item.create',
    item: {
      id: itemId,
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '[CONTROL client.request_score] Please provide final numeric score (0-100) with clarity/correctness/depth breakdown JSON.',
        },
      ],
    },
  };
  const responseEvent = {
    type: 'response.create',
    response: { conversation: 'auto' },
  };
  sendWhenOpen(control, createEvent);
  setTimeout(() => sendWhenOpen(control, responseEvent), 40);
}

// Deterministic fallback scoring (used if model does not respond in time)
export function computeDeterministicScore(state: RealtimeSessionState): {
  score: number;
  breakdown: FinalScoreBreakdown;
} {
  const questionsAnswered = (state.currentQuestionIndex ?? -1) + 1;
  const difficulty = state.difficultyTier ?? 3;
  // Simple heuristic distributions
  const clarity = Math.min(1, 0.55 + questionsAnswered * 0.03);
  const correctness = Math.min(
    1,
    0.5 + difficulty * 0.07 + questionsAnswered * 0.025
  );
  const depth = Math.min(
    1,
    0.45 + difficulty * 0.08 + questionsAnswered * 0.035
  );
  const score = Math.round(((clarity + correctness + depth) / 3) * 100);
  return {
    score,
    breakdown: {
      clarity: parseFloat(clarity.toFixed(2)),
      correctness: parseFloat(correctness.toFixed(2)),
      depth: parseFloat(depth.toFixed(2)),
    },
  };
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
