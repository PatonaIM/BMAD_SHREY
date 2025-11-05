'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  startRealtimeInterview,
  RealtimeSessionState,
} from '../../../services/interview/realtimeInterview';

interface RealtimeSessionBootstrapProps {
  applicationId: string;
  enableWebSocketFallback?: boolean;
}

export const RealtimeSessionBootstrap: React.FC<
  RealtimeSessionBootstrapProps
> = ({ applicationId, enableWebSocketFallback = true }) => {
  const [state, setState] = useState<RealtimeSessionState>({ phase: 'idle' });
  const [pcRef, setPcRef] = useState<RTCPeerConnection | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    function onRemoteStream() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remote = (window as any).__interviewV2RemoteStream as
        | MediaStream
        | undefined;
      if (
        remote &&
        audioElRef.current &&
        audioElRef.current.srcObject !== remote
      ) {
        audioElRef.current.srcObject = remote;
        const attempt = audioElRef.current.play();
        if (attempt && typeof attempt.then === 'function') {
          attempt.catch(() => {
            // Silent: autoplay might require user gesture.
          });
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

  useEffect(() => {
    function onReady() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = (window as any).__interviewV2LocalStream as
        | MediaStream
        | undefined;
      if (!stream || pcRef) return;
      startRealtimeInterview({
        applicationId,
        localStream: stream,
        onState: setState,
        enableWebSocketFallback,
      }).then(pc => setPcRef(pc));
    }
    window.addEventListener('interview:permissions_ready', onReady);
    return () =>
      window.removeEventListener('interview:permissions_ready', onReady);
  }, [applicationId, enableWebSocketFallback, pcRef]);

  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-xs space-y-2 bg-neutral-50 dark:bg-neutral-800">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Realtime Session</span>
        <StatusPill phase={state.phase} />
      </div>
      <div className="grid grid-cols-2 gap-2">
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
          label="Question #"
          value={
            state.currentQuestionIndex != null
              ? state.currentQuestionIndex.toString()
              : '—'
          }
        />
        <Info
          label="AI Speaking"
          value={
            state.aiSpeaking == null ? '—' : state.aiSpeaking ? 'YES' : 'NO'
          }
        />
      </div>
      {state.error && (
        <div className="text-red-600 dark:text-red-400">{state.error}</div>
      )}
      <div className="text-[10px] text-muted-foreground">
        Auto-starts after device permissions. Fallback engages if negotiation
        exceeds 8s.
      </div>
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
