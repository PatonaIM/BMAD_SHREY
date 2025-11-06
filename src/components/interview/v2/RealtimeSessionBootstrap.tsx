'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  startRealtimeInterview,
  RealtimeSessionState,
  RealtimeInterviewHandles,
  requestInterviewScore,
  sendInterviewStart,
  computeDeterministicScore,
} from '../../../services/interview/realtimeInterview';
import {
  CompositeRecorder,
  CompositeRecordingMetadata,
} from '../../../services/interview/compositeRecorder';

interface RealtimeSessionBootstrapProps {
  applicationId: string;
  enableWebSocketFallback?: boolean;
}

export const RealtimeSessionBootstrap: React.FC<
  RealtimeSessionBootstrapProps
> = ({ applicationId, enableWebSocketFallback = true }) => {
  const [state, setState] = useState<RealtimeSessionState>({
    phase: 'idle',
    interviewPhase: 'pre_start',
  });
  const [handles, setHandles] = useState<RealtimeInterviewHandles | null>(null);
  const [scoreRequested, setScoreRequested] = useState(false);
  const [readyForStart, setReadyForStart] = useState(false); // permissions acquired
  const [startInitiated, setStartInitiated] = useState(false); // user clicked Start Interview
  const recorderRef = useRef<CompositeRecorder | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1';
  // startSent removed: auto-start handled in startRealtimeInterview
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onRemoteStream() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remote = (window as any).__interviewV2RemoteStream as
        | MediaStream
        | undefined;
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn('[Interview DEBUG] remote_stream_ready', { remote });
      }
      if (
        remote &&
        audioElRef.current &&
        audioElRef.current.srcObject !== remote
      ) {
        audioElRef.current.srcObject = remote;
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(
            '[Interview DEBUG] audio element srcObject set',
            audioElRef.current
          );
        }
        const attempt = audioElRef.current.play();
        if (attempt && typeof attempt.then === 'function') {
          attempt.catch(err => {
            if (DEBUG) {
              // eslint-disable-next-line no-console
              console.warn('[Interview DEBUG] audio play() failed', err);
            }
          });
        }
        // Late injection of AI audio into composite recorder
        if (remote && recorderRef.current) {
          recorderRef.current.addAiAudioStream(remote);
          if (DEBUG) {
            // eslint-disable-next-line no-console
            console.warn('[Interview DEBUG] AI audio injected into recorder');
          }
        }
      }
    }
    window.addEventListener('interview:remote_stream_ready', onRemoteStream);
    return () =>
      window.removeEventListener(
        'interview:remote_stream_ready',
        onRemoteStream
      );
  }, []);

  // Permissions acquired → show Start Interview button
  useEffect(() => {
    function onPerms() {
      setReadyForStart(true);
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn('[Interview DEBUG] permissions_ready');
      }
    }
    window.addEventListener('interview:permissions_ready', onPerms);
    return () =>
      window.removeEventListener('interview:permissions_ready', onPerms);
  }, []);

  function beginInterview() {
    if (startInitiated || handles) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (window as any).__interviewV2LocalStream as
      | MediaStream
      | undefined;
    if (!stream) return;
    // Initialize interview timing
    setStartInitiated(true);
    setElapsedMs(0);
    // Start composite recorder immediately (local stream only; remote mixed later if available)
    try {
      recorderRef.current = new CompositeRecorder({
        rootElement: rootRef.current || document.body,
        localStream: stream,
        onMetadata: (meta: CompositeRecordingMetadata) => {
          // Expose metadata for debugging
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__interviewRecordingMeta = meta;
        },
        onError: (err: Error) => {
          // eslint-disable-next-line no-console
          console.warn('CompositeRecorder error', err);
        },
      });
      recorderRef.current?.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Recorder init failed', e);
    }
    startRealtimeInterview({
      applicationId,
      localStream: stream,
      onState: setState,
      enableWebSocketFallback,
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
    }).then(h => h && setHandles(h));
  }

  // After connection established, send greet start event (manual trigger)
  useEffect(() => {
    if (
      handles &&
      state.phase === 'connected' &&
      startInitiated &&
      state.interviewPhase === 'pre_start'
    ) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn('[Interview DEBUG] sending client.start', { handles });
      }
      sendInterviewStart(handles.controlChannel);
    }
  }, [handles, state.phase, startInitiated, state.interviewPhase]);

  // Auto-start now performed inside realtimeInterview.ts when connection established.

  // No longer need synthetic greet fallback with EP5-S21 - AI handles greeting naturally
  // Removed greeting logic

  // Stop recorder when interview completes
  useEffect(() => {
    if (recorderRef.current && state.interviewPhase === 'completed') {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn('[Interview DEBUG] stopping recorder', {
          phase: state.interviewPhase,
        });
      }
      recorderRef.current.stop();
    }
  }, [state.interviewPhase]);

  // Elapsed time tracking
  useEffect(() => {
    if (!startInitiated) return;
    let raf: number;
    const startTs = performance.now();
    const tick = () => {
      setElapsedMs(performance.now() - startTs);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [startInitiated]);

  function endAndScore() {
    if (!handles || scoreRequested) return;
    setScoreRequested(true);
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[Interview DEBUG] sending client.request_score', {
        handles,
      });
    }
    requestInterviewScore(handles.controlChannel);
    // Note: With EP5-S21, AI calls generate_final_feedback tool which transitions to 'completed'
    // No need to set 'scoring' phase anymore
    // Fallback local scoring placeholder if remote never returns after timeout
    setTimeout(() => {
      setState(s => {
        if (s.finalScore != null || s.interviewPhase === 'completed') return s;
        const result = computeDeterministicScore(s);
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(
            '[Interview DEBUG] fallback deterministic score applied',
            result
          );
        }
        return {
          ...s,
          finalScore: result.score,
          finalScoreBreakdown: result.breakdown,
          interviewPhase: 'completed',
        };
      });
    }, 8000);
  }

  return (
    <div
      ref={rootRef}
      className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-xs space-y-2 bg-neutral-50 dark:bg-neutral-800"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">Realtime Session</span>
        <StatusPill phase={state.phase} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Info
          label="Elapsed s"
          value={startInitiated ? (elapsedMs / 1000).toFixed(1) : '0.0'}
        />
        <Info label="Phase" value={state.phase} />
        <Info label="Conn" value={state.connectionState || '—'} />
        <Info label="ICE" value={state.iceGatheringState || '—'} />
        <Info
          label="Offer→Answer ms"
          value={
            state.latencyMs != null
              ? Math.round(state.latencyMs).toString()
              : '—'
          }
        />
        <Info
          label="First Audio ms"
          value={
            state.firstAudioFrameLatencyMs != null
              ? Math.round(state.firstAudioFrameLatencyMs).toString()
              : '—'
          }
        />
        <Info
          label="Jitter Avg ms"
          value={
            state.avgInboundAudioJitterMs != null
              ? state.avgInboundAudioJitterMs.toString()
              : '—'
          }
        />
        <Info
          label="Turn Active"
          value={
            state.currentTurnActive == null
              ? '—'
              : state.currentTurnActive
                ? 'YES'
                : 'NO'
          }
        />
        <Info
          label="AI Speaking"
          value={
            state.aiSpeaking == null ? '—' : state.aiSpeaking ? 'YES' : 'NO'
          }
        />
        <Info
          label="Diff Tier"
          // eslint-disable-next-line prettier/prettier
          value={
            state.difficultyTier != null ? state.difficultyTier.toString() : '—'
          }
        />
        <Info
          label="Gaps"
          value={
            state.missingSkills && state.missingSkills.length
              ? state.missingSkills.length.toString()
              : '0'
          }
        />
      </div>
      {state.error && (
        <div className="text-red-600 dark:text-red-400">{state.error}</div>
      )}
      <div className="text-[10px] text-muted-foreground">
        Click Start Interview once device permissions succeed. Connection
        establishes then AI greets you. Fallback engages if negotiation exceeds
        8s.
      </div>
      {readyForStart && !startInitiated && state.phase === 'idle' && (
        <button
          onClick={beginInterview}
          className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Start Interview
        </button>
      )}
      {state.interviewPhase === 'started' && (
        <button
          onClick={endAndScore}
          disabled={scoreRequested}
          className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          End & Score Interview
        </button>
      )}
      {state.interviewPhase === 'completed' && (
        <div className="text-xs font-semibold">
          Final Score: {state.finalScore != null ? state.finalScore : '—'} / 100
          {state.finalScoreBreakdown && (
            <div className="mt-1 text-[10px] font-normal space-x-2">
              <span>clarity {state.finalScoreBreakdown.clarity}</span>
              <span>correctness {state.finalScoreBreakdown.correctness}</span>
              <span>depth {state.finalScoreBreakdown.depth}</span>
            </div>
          )}
        </div>
      )}
      <audio ref={audioElRef} autoPlay playsInline className="hidden" />
    </div>
  );
};

const StatusPill: React.FC<{ phase: string }> = ({ phase }) => {
  const color =
    phase === 'connected'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : phase === 'error'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : phase === 'fallback'
          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200';
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${color}`}
    >
      {phase}
    </span>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {label}
    </span>
    <span className="font-medium truncate">{value}</span>
  </div>
);
