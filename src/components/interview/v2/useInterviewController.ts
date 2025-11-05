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
  targetQuestions: number;
  begin: () => void;
  endAndScore: () => void;
  elapsedMs: number;
  scoreBreakdown?: RealtimeSessionState['finalScoreBreakdown'];
  handles: RealtimeInterviewHandles | null;
}

export function useInterviewController(
  opts: UseInterviewControllerOptions
): InterviewController {
  const { applicationId, targetQuestionCount = 6 } = opts;
  const [state, setState] = useState<RealtimeSessionState>({
    phase: 'idle',
    interviewPhase: 'pre_start',
  });
  const [handles, setHandles] = useState<RealtimeInterviewHandles | null>(null);
  const [feed, setFeed] = useState<InterviewFeedItem[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const scoreRequestedRef = useRef(false);
  const startTsRef = useRef<number | null>(null);
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
          case 'interview.greet':
            pushFeed({
              ts: Date.now(),
              type: 'greet',
              // Split long expression for formatter compliance
              text: detail.payload?.message
                ? detail.payload.message
                : 'Hello, please introduce yourself.',
              payload: detail.payload,
            });
            break;
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
    if (handles || state.phase !== 'idle') return;
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
  }, [applicationId, handles, state.phase]);

  // Kick off greeting once connected and still in pre_start
  useEffect(() => {
    if (
      handles &&
      state.phase === 'connected' &&
      state.interviewPhase === 'pre_start'
    ) {
      sendInterviewStart(handles.controlChannel);
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: 'Started interview session',
      });
    }
  }, [handles, state.phase, state.interviewPhase, pushFeed]);

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
  useEffect(() => {
    if (state.phase !== prevPhaseRef.current) {
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: `Transport phase → ${state.phase}`,
      });
      prevPhaseRef.current = state.phase;
    }
  }, [state.phase, pushFeed]);
  useEffect(() => {
    if (state.error) {
      pushFeed({
        ts: Date.now(),
        type: 'info',
        text: `Error: ${state.error}`,
      });
    }
  }, [state.error, pushFeed]);

  const endAndScore = useCallback(() => {
    if (!handles || scoreRequestedRef.current) return;
    scoreRequestedRef.current = true;
    requestInterviewScore(handles.controlChannel);
    setState(s => ({ ...s, interviewPhase: 'scoring' }));
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
    targetQuestions: targetQuestionCount,
    begin,
    endAndScore,
    elapsedMs,
    scoreBreakdown: state.finalScoreBreakdown,
    handles,
  };
}
