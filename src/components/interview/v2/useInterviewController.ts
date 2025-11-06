import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startRealtimeInterview,
  RealtimeSessionState,
  RealtimeInterviewHandles,
  sendInterviewStart,
  requestInterviewScore,
  computeDeterministicScore,
  FinalScoreBreakdown,
} from '../../../services/interview/realtimeInterview';

interface UseInterviewControllerOptions {
  applicationId: string;
  autoInjectRemoteAudioInto?: MediaStreamAudioDestinationNode; // future
  targetQuestionCount?: number; // placeholder for progress meter
}

export interface InterviewFeedItem {
  id: string;
  ts: number;
  type: 'greet' | 'question' | 'score' | 'done' | 'info';
  text: string;
  // Structured supplemental data for the feed entry (e.g., question metadata or score breakdown)
  payload?: Record<string, unknown> | FinalScoreBreakdown;
}

export interface InterviewController {
  state: RealtimeSessionState;
  feed: InterviewFeedItem[];
  begin: () => void;
  endAndScore: () => void;
  elapsedMs: number;
  scoreBreakdown?: RealtimeSessionState['finalScoreBreakdown'];
  handles: RealtimeInterviewHandles | null;
}

export function useInterviewController(
  opts: UseInterviewControllerOptions
): InterviewController {
  const { applicationId } = opts;
  const [state, setState] = useState<RealtimeSessionState>({
    phase: 'idle',
    interviewPhase: 'pre_start',
  });
  const [handles, setHandles] = useState<RealtimeInterviewHandles | null>(null);
  const [feed, setFeed] = useState<InterviewFeedItem[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const scoreRequestedRef = useRef(false);
  const startTsRef = useRef<number | null>(null);
  const greetingSentRef = useRef(false);
  // Debug flag (reserved for future verbose logging if needed)
  // const DEBUG = process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1';

  const pushFeed = useCallback((item: Omit<InterviewFeedItem, 'id'>) => {
    setFeed(f => [
      ...f,
      { id: `${item.type}_${item.ts}_${f.length}`, ...item },
    ]);
  }, []);

  // Attach event listeners for parsed events (from underlying realtime layer)
  useEffect(() => {
    function onEvent(e: Event) {
      const detail = (e as CustomEvent).detail as {
        type?: string;
        payload?: {
          message?: string;
          idx?: number;
          topic?: string;
        };
      } | null;
      if (!detail || typeof detail !== 'object') return;
      if (detail.type) {
        switch (detail.type) {
          case 'question.ready':
            pushFeed({
              ts: Date.now(),
              type: 'question',
              text: `Question ${detail.payload?.idx ?? ''}: ${detail.payload?.topic ?? 'Unnamed Topic'}`,
              payload: detail.payload,
            });
            break;
          case 'interview.score':
            pushFeed({
              ts: Date.now(),
              type: 'score',
              text: 'Scoring received',
              payload: detail.payload,
            });
            break;
          case 'interview.done':
            pushFeed({
              ts: Date.now(),
              type: 'done',
              text: 'Interview completed',
            });
            break;
          default:
            break;
        }
      }
    }
    window.addEventListener('interview:rtc_event', onEvent);
    const onRemote = () =>
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: 'Remote AI audio connected',
      });
    window.addEventListener('interview:remote_stream_ready', onRemote);
    return () => window.removeEventListener('interview:rtc_event', onEvent);
  }, [pushFeed]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (startTsRef.current != null) {
        setElapsedMs(performance.now() - startTsRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const begin = useCallback(() => {
    // Guard: prevent redundant calls if already started
    if (
      handles ||
      state.phase !== 'idle' ||
      state.interviewPhase !== 'pre_start'
    ) {
      if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1') {
        // eslint-disable-next-line no-console
        console.warn(
          '[Interview] begin() blocked - already started or in progress'
        );
      }
      return;
    }

    // Acquire pre-stored local stream from permission gate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localStream: MediaStream | undefined = (window as any)
      .__interviewV2LocalStream;
    if (!localStream) {
      // Provide user-facing feedback if permissions not yet granted
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: 'Waiting for device permissions before starting…',
      });
      return;
    }

    // NEW: Call start-session API before WebRTC initialization
    (async () => {
      try {
        const metadata = {
          deviceType: /Mobi/i.test(navigator.userAgent)
            ? 'mobile'
            : ('desktop' as const),
          userAgent: navigator.userAgent,
        };

        pushFeed({
          ts: Date.now(),
          type: 'info',
          text: 'Initializing interview session...',
        });

        const sessionRes = await fetch('/api/interview/start-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            metadata,
          }),
        });

        if (sessionRes.ok) {
          const { ok, value } = await sessionRes.json();
          if (ok && value) {
            const { sessionId, token, expiresAt } = value;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__interviewSessionId = sessionId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__interviewSessionToken = token;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__interviewSessionExpiry = expiresAt;

            // Log analytics event for successful session start
            if (typeof window !== 'undefined' && 'gtag' in window) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).gtag('event', 'interview_session_started', {
                event_category: 'interview',
                session_id: sessionId,
                application_id: applicationId,
              });
            }

            if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1') {
              // eslint-disable-next-line no-console
              console.log('[Interview] Session started:', sessionId);
            }

            pushFeed({
              ts: Date.now(),
              type: 'info',
              text: `Session ${sessionId.slice(0, 8)} created`,
            });
          }
        } else {
          const error = await sessionRes.json();
          // eslint-disable-next-line no-console
          console.warn('[Interview] start-session API failed:', error);

          // Log analytics event for API failure
          if (typeof window !== 'undefined' && 'gtag' in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).gtag('event', 'interview_session_api_failed', {
              event_category: 'interview',
              application_id: applicationId,
              error_code: error?.error?.code || 'UNKNOWN',
            });
          }

          pushFeed({
            ts: Date.now(),
            type: 'info',
            text: 'Running in offline mode',
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Interview] start-session error:', err);

        // Log analytics event for offline mode
        if (typeof window !== 'undefined' && 'gtag' in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).gtag('event', 'interview_session_offline_mode', {
            event_category: 'interview',
            application_id: applicationId,
            error: err instanceof Error ? err.message : 'Unknown',
          });
        }

        pushFeed({
          ts: Date.now(),
          type: 'info',
          text: 'Running in offline mode (API unavailable)',
        });
      }

      // Continue with existing WebRTC setup
      startTsRef.current = performance.now();
      startRealtimeInterview({
        applicationId,
        localStream,
        onState: setState,
        enableWebSocketFallback: true,
        jobProfile: {
          requiredSkills: [
            'system design',
            'algorithms',
            'data structures',
            'communication',
          ],
          roleType: 'technical',
        },
        initialDifficultyTier: 3,
        maxContextTokens: 1200,
      }).then(h => {
        if (h) {
          setHandles(h);
        }
      });
    })();
  }, [applicationId, handles, state.phase, state.interviewPhase, pushFeed]);

  // Kick off greeting once connected - send when channel is ready
  useEffect(() => {
    if (handles && state.phase === 'connected' && !greetingSentRef.current) {
      greetingSentRef.current = true;
      sendInterviewStart(handles.controlChannel);
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: 'Interview started - AI is greeting you',
      });
    }
  }, [handles, state.phase, pushFeed]);

  // Diagnostic: if no remote audio stream appears shortly after connection, notify feed.
  useEffect(() => {
    if (!handles) return;
    const timeout = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = window;
      if (!w.__interviewV2RemoteStream) {
        pushFeed({
          ts: Date.now(),
          type: 'info',
          text: 'Remote audio not detected yet (check model audio config / voice settings)',
        });
      }
    }, 6000);
    return () => clearTimeout(timeout);
  }, [handles, pushFeed]);

  // Feed updates for phase transitions & errors
  const prevPhaseRef = useRef<string | undefined>(state.phase);
  const prevInterviewPhaseRef = useRef<string | undefined>(
    state.interviewPhase
  );

  useEffect(() => {
    if (state.phase !== prevPhaseRef.current) {
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: `Transport phase → ${state.phase}`,
      });

      if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1') {
        // eslint-disable-next-line no-console
        console.log(
          `[Interview] Transport phase: ${prevPhaseRef.current} → ${state.phase}`
        );
      }

      prevPhaseRef.current = state.phase;
    }
  }, [state.phase, pushFeed]);

  useEffect(() => {
    if (state.interviewPhase !== prevInterviewPhaseRef.current) {
      if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1') {
        // eslint-disable-next-line no-console
        console.log(
          `[Interview] Interview phase: ${prevInterviewPhaseRef.current} → ${state.interviewPhase}`
        );
      }
      prevInterviewPhaseRef.current = state.interviewPhase;
    }
  }, [state.interviewPhase]);

  useEffect(() => {
    if (state.error) {
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: `Error: ${state.error}`,
      });

      if (process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1') {
        // eslint-disable-next-line no-console
        console.error(`[Interview] Error: ${state.error}`);
      }
    }
  }, [state.error, pushFeed]);

  const endAndScore = useCallback(() => {
    if (!handles || scoreRequestedRef.current) return;
    scoreRequestedRef.current = true;
    requestInterviewScore(handles.controlChannel);
    // EP5-S21: AI will call generate_final_feedback tool which transitions to 'completed'
    // No need to set 'scoring' phase manually
    pushFeed({
      ts: Date.now(),
      type: 'info',
      text: 'Requested final score',
    });
    setTimeout(() => {
      setState(s => {
        if (s.finalScore != null || s.interviewPhase === 'completed') return s;
        const fallback = computeDeterministicScore(s);
        pushFeed({
          ts: Date.now(),
          type: 'score',
          text: `Fallback score ${fallback.score}`,
          payload: fallback.breakdown,
        });
        return {
          ...s,
          finalScore: fallback.score,
          finalScoreBreakdown: fallback.breakdown,
          interviewPhase: 'completed',
        };
      });
    }, 8000);
  }, [handles, pushFeed]);

  return {
    state,
    feed,
    begin,
    endAndScore,
    elapsedMs,
    scoreBreakdown: state.finalScoreBreakdown,
    handles,
  };
}
