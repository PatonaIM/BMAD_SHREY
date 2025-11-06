// EP5-S2: WebRTC + OpenAI Realtime integration scaffold (refactored)
// Focus: structural handshake + state updates + event exposure. Not production ready.

export interface FinalScoreBreakdown {
  clarity: number;
  correctness: number;
  depth: number;
  summary?: string;
}

export interface DetailedFeedback {
  strengths: string[];
  improvements: string[];
  summary: string;
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
  // Interview journey phases (EP5-S21: simplified to 3 states)
  interviewPhase?: 'pre_start' | 'started' | 'completed';
  finalScore?: number; // 0..100 once completed
  finalScoreBreakdown?: FinalScoreBreakdown;
  detailedFeedback?: DetailedFeedback; // EP5-S21: Detailed strengths/improvements
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

      // Try to parse as JSON to see ALL event types and handle OpenAI Realtime API events
      try {
        const parsed = JSON.parse(ev.data);

        // Handle OpenAI Realtime API audio events for aiSpeaking state
        if (parsed && parsed.type) {
          // AI starts speaking when audio playback begins
          // Only update if state actually changes to avoid spam
          if (parsed.type === 'output_audio_buffer.started') {
            if (!current.aiSpeaking) {
              // eslint-disable-next-line no-console
              console.log(
                '[AI SPEAKING] 🎤 AI started speaking - event:',
                parsed.type,
                'timestamp:',
                new Date().toISOString()
              );
              const evtState: Partial<RealtimeSessionState> = {
                aiSpeaking: true,
                lastEventTs: Date.now(),
              };
              current = { ...current, ...evtState };
              update(evtState);
            }
          }

          // AI stops speaking when audio buffer playback actually stops
          if (parsed.type === 'output_audio_buffer.stopped') {
            if (current.aiSpeaking) {
              // eslint-disable-next-line no-console
              console.log(
                '[AI SPEAKING] 🔇 AI stopped speaking - event:',
                parsed.type,
                'timestamp:',
                new Date().toISOString()
              );
              const evtState: Partial<RealtimeSessionState> = {
                aiSpeaking: false,
                lastEventTs: Date.now(),
              };
              current = { ...current, ...evtState };
              update(evtState);
            }
          }

          // Log function-related events for debugging
          if (parsed.type.includes('function')) {
            // eslint-disable-next-line no-console
            console.log(
              '[RTC] Function-related event:',
              JSON.stringify(parsed, null, 2)
            );
          }
        }
      } catch {
        // not JSON
      }

      const parsed = parseInterviewRTCEvent(ev.data);
      if (parsed) {
        // Update session state based on event type
        const evtState: Partial<RealtimeSessionState> = {
          lastEventTs: parsed.ts,
        };
        Object.assign(evtState, applyInterviewRTCEvent(current, parsed));
        // Invoke context assembler only when in started phase on question.ready events
        if (
          parsed.type === 'question.ready' &&
          (current.interviewPhase === 'started' ||
            evtState.interviewPhase === 'started') &&
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
              call_id?: string;
              name?: string;
              delta?: string;
              arguments?: string;
              item?: {
                id?: string;
                call_id?: string;
                name?: string;
                type?: string;
              };
            };
            switch (m.type) {
              case 'response.output_item.added': {
                // This event contains the function name and call_id
                const callId = m.item?.call_id;
                const name = m.item?.name;
                if (callId && name) {
                  if (!toolCallBuffers[callId]) {
                    toolCallBuffers[callId] = { name, args: '' };
                  } else {
                    toolCallBuffers[callId].name = name;
                  }
                  // eslint-disable-next-line no-console
                  console.log('[RTC] Function call started:', { name, callId });
                }
                break;
              }
              case 'response.function_call_arguments.delta': {
                // Streaming arguments for a function call
                const toolId: string | undefined = m.call_id;
                if (toolId) {
                  if (!toolCallBuffers[toolId]) {
                    toolCallBuffers[toolId] = { name: m.name, args: '' };
                  }
                  // Update name if provided (it may come in any delta)
                  if (m.name) {
                    toolCallBuffers[toolId].name = m.name;
                  }
                  const deltaArgs = m.delta;
                  if (deltaArgs) {
                    toolCallBuffers[toolId].args += String(deltaArgs);
                  }

                  // Debug logging to track name assignment
                  if (
                    process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1' &&
                    m.name
                  ) {
                    // eslint-disable-next-line no-console
                    console.log(
                      '[RTC] Tool name received in delta:',
                      m.name,
                      'for call_id:',
                      toolId
                    );
                  }
                }
                break;
              }
              case 'response.function_call_arguments.done': {
                const toolId: string | undefined = m.call_id;
                if (toolId && toolCallBuffers[toolId]) {
                  let { name } = toolCallBuffers[toolId];
                  const { args } = toolCallBuffers[toolId];

                  // If name is still missing, try to get it from the done event
                  if (!name && m.name) {
                    name = m.name;
                    toolCallBuffers[toolId].name = m.name;
                  }

                  delete toolCallBuffers[toolId];

                  // Debug logging
                  // eslint-disable-next-line no-console
                  console.log('[RTC] Tool call completed:', {
                    name,
                    toolId,
                    args: args.substring(0, 100),
                  });

                  // Use m.arguments if available (complete arguments), fallback to buffered
                  const argsToUse = m.arguments || args;
                  let parsedArgs: Record<string, unknown> | undefined;
                  if (argsToUse && argsToUse.trim()) {
                    try {
                      parsedArgs = JSON.parse(argsToUse);
                    } catch {
                      /* ignore malformed args */
                    }
                  }
                  // Map tool name to interview event type
                  const map: Record<string, InterviewRTCEvent['type']> = {
                    question_ready: 'question.ready',
                    interview_score: 'interview.score',
                    interview_done: 'interview.done',
                  };
                  const evtType = name ? map[name] : undefined;

                  // Handle new EP5-S21 tools
                  if (name === 'submit_answer_score' && parsedArgs) {
                    // Validate and sanitize args
                    const questionText = String(
                      parsedArgs.questionText || 'Question'
                    ).substring(0, 200);
                    const score = Math.max(
                      0,
                      Math.min(100, Number(parsedArgs.score) || 0)
                    );
                    const feedback = String(
                      parsedArgs.feedback || 'No feedback provided'
                    ).substring(0, 500);

                    // Call API to store question score
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sessionId = (window as any).__interviewSessionId;
                    if (sessionId) {
                      fetch('/api/interview/submit-question-score', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sessionId,
                          questionText,
                          score,
                          feedback,
                        }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.scoreData) {
                            // Emit event for LiveFeedbackPanel with scoreData
                            window.dispatchEvent(
                              new CustomEvent('interview:question_score', {
                                detail: data.scoreData,
                              })
                            );
                            // eslint-disable-next-line no-console
                            console.log(
                              '[RTC] Question score emitted:',
                              data.scoreData
                            );
                          }
                        })
                        .catch(err => {
                          // eslint-disable-next-line no-console
                          console.error('[RTC] Failed to submit score:', err);
                        });
                    }
                    return; // Don't map to RTC event
                  }

                  if (name === 'generate_final_feedback' && parsedArgs) {
                    // Update state with detailed feedback and transition to completed
                    update({
                      interviewPhase: 'completed',
                      finalScore: parsedArgs.overallScore as number,
                      finalScoreBreakdown: {
                        clarity: 0, // deprecated but keep for compatibility
                        correctness: 0,
                        depth: 0,
                        summary: parsedArgs.summary as string,
                      },
                      detailedFeedback: {
                        strengths: parsedArgs.strengths as string[],
                        improvements: parsedArgs.improvements as string[],
                        summary: parsedArgs.summary as string,
                      },
                    });

                    // Emit completion event
                    window.dispatchEvent(
                      new CustomEvent('interview:completed', {
                        detail: {
                          score: parsedArgs.overallScore,
                          feedback: parsedArgs,
                        },
                      })
                    );
                    return; // Don't map to RTC event
                  }

                  // eslint-disable-next-line no-console
                  console.log('[RTC] Event type mapped:', {
                    name,
                    evtType,
                    parsedArgs,
                  });

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

                    // eslint-disable-next-line no-console
                    console.log('[RTC] Applying state update:', {
                      evt,
                      evtState,
                    });

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
    let hasReceivedFirstAudio = false;
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
      // Transition to started phase when first audio arrives (AI is greeting)
      if (!hasReceivedFirstAudio && current.interviewPhase === 'pre_start') {
        hasReceivedFirstAudio = true;
        update({ interviewPhase: 'started' });
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.log(
            '[Interview DEBUG] AI audio started - transitioned to started phase'
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
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1';

  if (control.readyState === 'open') {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[Interview DEBUG] Sending control message:', payload.type);
    }
    control.send(JSON.stringify(payload));
    return;
  }
  if (attempts > 40) {
    // give up after ~4s (100ms * 40)
    // eslint-disable-next-line no-console
    console.warn('DataChannel not open, abandoning send', payload.type);
    return;
  }
  if (DEBUG && attempts % 10 === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[Interview DEBUG] Waiting for channel to open, attempt ${attempts}, state:`,
      control.readyState
    );
  }
  setTimeout(() => sendWhenOpen(control, payload, attempts + 1), 100);
}

export function sendInterviewStart(control: RTCDataChannel): void {
  // OpenAI Realtime API rejects unknown event types like 'client.start'.
  // We map our control intent into a supported pair of events:
  // 1. conversation.item.create (user message with sentinel)
  // 2. response.create (ask model to generate)
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1';

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      '[Interview DEBUG] sendInterviewStart called, channel state:',
      control.readyState
    );
  }

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
      modalities: ['text', 'audio'],
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
      // Note: With EP5-S21 simplification, we stay in 'started' phase throughout
      // eslint-disable-next-line no-console
      console.log('[RTC] question.ready received, phase:', prev.interviewPhase);
      break;
    }
    case 'ai.state': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      partial.aiSpeaking = !!(evt.payload as any)?.speaking;
      break;
    }
    case 'interview.score': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = evt.payload as any;
      const score = payload?.score;
      const breakdown = payload?.breakdown;
      const summary = payload?.summary;
      if (typeof score === 'number') partial.finalScore = score;
      if (breakdown && typeof breakdown === 'object') {
        partial.finalScoreBreakdown = {
          clarity: breakdown.clarity || 0,
          correctness: breakdown.correctness || 0,
          depth: breakdown.depth || 0,
          summary: summary || undefined,
        };
      }
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
