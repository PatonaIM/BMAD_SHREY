'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInterviewController } from './useInterviewController';
import { DevicePermissionGate } from './DevicePermissionGate';
import { applyLegacyTheme } from '../../../styles/legacyInterviewTheme';
import { RealtimeSessionBootstrap } from './RealtimeSessionBootstrap';
import { AIAvatarCanvas } from './AIAvatarCanvas';

interface ModernInterviewPageProps {
  applicationId: string;
}

// Gradient applied inline; variable removed to satisfy unused var lint.

export const ModernInterviewPage: React.FC<ModernInterviewPageProps> = ({
  applicationId,
}) => {
  const controller = useInterviewController({ applicationId });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteAudioStream, setRemoteAudioStream] =
    useState<MediaStream | null>(null);

  useEffect(() => {
    applyLegacyTheme();
  }, []);

  // Track local stream readiness
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__interviewV2LocalStream) setLocalReady(true);
    const handler = () => setLocalReady(true);
    window.addEventListener('interview:permissions_ready', handler);
    return () =>
      window.removeEventListener('interview:permissions_ready', handler);
  }, []);

  // Reset loading state when phase changes from pre_start
  const phase = controller.state.interviewPhase || 'pre_start';
  useEffect(() => {
    if (phase !== 'pre_start' && isStarting) {
      setIsStarting(false);
    }
  }, [phase, isStarting]);

  const handleBegin = () => {
    setIsStarting(true);
    controller.begin();
  };

  const progressPct = useMemo(() => {
    if (
      controller.state.currentQuestionIndex == null ||
      controller.targetQuestions <= 0
    )
      return 0;
    const answered = controller.state.currentQuestionIndex + 1;
    return Math.min(100, (answered / controller.targetQuestions) * 100);
  }, [controller.state.currentQuestionIndex, controller.targetQuestions]);

  const elapsedSeconds = (controller.elapsedMs / 1000).toFixed(1);

  const difficulty = controller.state.difficultyTier ?? 3;

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans flex flex-col">
      <div className="absolute inset-0 -z-10 opacity-40 blur-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
      <div className="absolute inset-0 -z-10 bg-neutral-950/80 backdrop-blur" />

      {/* Device Check Modal */}
      {phase === 'pre_start' && (
        <DeviceCheckModal
          applicationId={applicationId}
          localReady={localReady}
          isStarting={isStarting}
          onBegin={handleBegin}
        />
      )}

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <DiagnosticsModal
          applicationId={applicationId}
          controller={controller}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Fixed Header */}
      <div className="flex-none px-4 pt-4">
        <HeaderBar
          applicationId={applicationId}
          elapsedSeconds={elapsedSeconds}
          phase={phase}
          difficulty={difficulty}
          progressPct={progressPct}
          onEndInterview={controller.endAndScore}
          onToggleDiagnostics={() => setShowDiagnostics(prev => !prev)}
        />
      </div>

      {/* Flexible Content Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden">
        <div className="h-full grid lg:grid-cols-2 gap-4">
          {/* Left: Candidate Video */}
          <CandidatePanel phase={phase} />

          {/* Right: Split Panel - Interviewer + Live Feedback */}
          <div className="flex flex-col gap-4 h-full">
            {/* Top: AI Interviewer Panel */}
            <InterviewerPanel
              phase={phase}
              isSpeaking={controller.state.aiSpeaking ?? false}
              audioStream={remoteAudioStream}
            />

            {/* Bottom: Live Feedback Panel */}
            <LiveFeedbackPanel controller={controller} phase={phase} />
          </div>
        </div>
      </div>

      <RemoteAIAudioPlayer onStreamReady={setRemoteAudioStream} />
    </div>
  );
};

// Header with progress + status + action buttons
const HeaderBar: React.FC<{
  applicationId: string;
  elapsedSeconds: string;
  phase: string;
  difficulty: number;
  progressPct: number;
  onEndInterview: () => void;
  onToggleDiagnostics: () => void;
}> = ({
  applicationId,
  elapsedSeconds,
  phase,
  difficulty,
  progressPct,
  onEndInterview,
  onToggleDiagnostics,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur shadow-2xl overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            AI Technical Interview{' '}
            <span className="text-indigo-400">(Beta)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Application <span className="font-mono">{applicationId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <StatusPill phase={phase} />
          <Badge label={`Difficulty T${difficulty}`} variant="purple" />
          <Badge label={`${elapsedSeconds}s`} variant="slate" />

          {/* Diagnostics Icon Button */}
          <button
            onClick={onToggleDiagnostics}
            className="p-2 rounded-lg border border-white/10 bg-neutral-800/60 hover:bg-neutral-700/80 transition text-neutral-300 hover:text-white"
            title="Toggle Diagnostics"
            aria-label="Toggle diagnostics"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* End Interview Button - visible during conducting phase */}
          {phase === 'conducting' && (
            <button
              onClick={onEndInterview}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white hover:brightness-110 transition text-xs font-medium shadow flex items-center gap-1.5"
              aria-label="End interview"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              End Interview
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full bg-neutral-800 relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};

// Left panel: Candidate's video feed
const CandidatePanel: React.FC<{ phase: string }> = ({ phase }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attach local stream once permission gate stored it
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (window as any).__interviewV2LocalStream as
      | MediaStream
      | undefined;
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => undefined);
    }
  });

  return (
    <div className="relative w-full h-full min-h-0 rounded-xl overflow-hidden bg-neutral-800/60 ring-1 ring-white/5 border border-white/10">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        aria-label="Your video feed"
      />
      <div className="absolute left-4 top-4 bg-neutral-900/70 backdrop-blur px-3 py-1 rounded-md text-[10px] uppercase tracking-wide text-neutral-200 ring-1 ring-white/10">
        You
      </div>
      {(phase === 'conducting' || phase === 'intro') && (
        <div className="absolute left-4 bottom-4 bg-green-600/80 backdrop-blur px-3 py-1 rounded-md text-[10px] font-medium text-white ring-1 ring-green-400/30 flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Recording
        </div>
      )}
    </div>
  );
};

// Hidden audio element that plays remote AI audio when stream becomes available
const RemoteAIAudioPlayer: React.FC<{
  onStreamReady?: (_stream: MediaStream) => void;
}> = ({ onStreamReady }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackDiagnostic, setTrackDiagnostic] = useState<string>('');
  const [needsManualUnmute, setNeedsManualUnmute] = useState(false);

  const forcePlay = () => {
    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 1.0;
      audioRef.current
        .play()
        .then(() => {
          setNeedsManualUnmute(false);
          // eslint-disable-next-line no-console
          console.log('[Audio Debug] Manual play successful');
        })
        .catch(err => {
          // eslint-disable-next-line no-console
          console.error('[Audio Debug] Manual play still failed:', err);
        });
    }
  };

  useEffect(() => {
    function attach() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remote: MediaStream | undefined = (window as any)
        .__interviewV2RemoteStream;
      if (remote && audioRef.current && audioRef.current.srcObject !== remote) {
        audioRef.current.srcObject = remote;

        // Notify parent component about stream availability
        if (onStreamReady) {
          onStreamReady(remote);
        }

        // Diagnostic: check audio tracks
        const audioTracks = remote.getAudioTracks();
        if (audioTracks.length === 0) {
          setTrackDiagnostic(
            '⚠️ Remote stream has no audio tracks. Server may not be sending audio.'
          );
          // eslint-disable-next-line no-console
          console.error(
            '[Audio Debug] No audio tracks in remote stream. Check server-side modalities config.'
          );
        } else {
          const track = audioTracks[0];
          if (track) {
            const updateTrackState = () => {
              setTrackDiagnostic(
                `✅ Audio track: ${track.readyState} (${track.enabled ? 'enabled' : 'disabled'}) muted=${track.muted}`
              );
            };
            updateTrackState();

            // Listen for track state changes
            track.addEventListener('ended', updateTrackState);
            track.addEventListener('mute', updateTrackState);
            track.addEventListener('unmute', updateTrackState);

            if (track.readyState === 'ended' || !track.enabled) {
              // eslint-disable-next-line no-console
              console.warn(
                '[Audio Debug] Audio track present but not live:',
                track
              );
            } else {
              // eslint-disable-next-line no-console
              console.log(
                '[Audio Debug] Audio track ready:',
                track.readyState,
                'enabled:',
                track.enabled,
                'muted:',
                track.muted
              );
            }
          }
        }

        // Force play with explicit volume
        if (audioRef.current) {
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          audioRef.current
            .play()
            .then(() => {
              // eslint-disable-next-line no-console
              console.log('[Audio Debug] Audio element playing successfully');
            })
            .catch(err => {
              // eslint-disable-next-line no-console
              console.error('[Audio Debug] Play failed:', err);
              setTrackDiagnostic(
                prev => `${prev} | Play error: ${err.message}`
              );
              // Show manual unmute button if autoplay fails
              setNeedsManualUnmute(true);
            });
        }
      }
    }
    attach();
    window.addEventListener('interview:remote_stream_ready', attach);
    return () =>
      window.removeEventListener('interview:remote_stream_ready', attach);
  }, [onStreamReady]);

  return (
    <>
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        // Intentionally not muted – this is the AI audio the user must hear.
        className="hidden"
      />
      {needsManualUnmute && (
        <button
          onClick={forcePlay}
          className="fixed bottom-20 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg shadow-2xl text-sm font-medium z-50 flex items-center gap-2 animate-pulse"
        >
          🔊 Click to Unmute AI Audio
        </button>
      )}
      {trackDiagnostic && process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1' && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 border border-amber-400/50 text-amber-200 text-xs p-3 rounded-lg max-w-sm shadow-xl z-50">
          {trackDiagnostic}
        </div>
      )}
    </>
  );
};

// Shared UI primitives
const StatusPill: React.FC<{ phase: string }> = ({ phase }) => {
  const colorMap: Record<string, string> = {
    connected: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    error: 'bg-red-500/15 text-red-300 ring-red-400/30',
    fallback: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
    default: 'bg-neutral-500/15 text-neutral-300 ring-neutral-400/30',
  };
  const cls = colorMap[phase] || colorMap.default;
  return (
    <span
      className={`px-2 py-1 rounded-md text-[10px] font-medium ring-1 ring-inset ${cls} uppercase tracking-wide`}
    >
      {phase}
    </span>
  );
};

interface BadgeProps {
  label: string;
  variant?: 'purple' | 'slate';
}
const Badge: React.FC<BadgeProps> = ({ label, variant = 'slate' }) => {
  const variants: Record<string, string> = {
    purple:
      'bg-purple-500/15 text-purple-200 ring-1 ring-inset ring-purple-400/30',
    slate: 'bg-slate-500/15 text-slate-200 ring-1 ring-inset ring-slate-400/30',
  };
  return (
    <span
      className={`px-2 py-1 rounded-md text-[10px] font-medium ${variants[variant]}`}
    >
      {label}
    </span>
  );
};

const PrimaryButton: React.FC<{
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
  loading?: boolean;
}> = ({ label, onClick, disabled, variant = 'primary', loading = false }) => {
  const base =
    'px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition shadow';
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white hover:brightness-110',
    danger:
      'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:brightness-110',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${loading ? 'relative' : ''}`}
    >
      {loading && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      <span className={loading ? 'ml-6' : ''}>{label}</span>
    </button>
  );
};

// Device Check Modal
const DeviceCheckModal: React.FC<{
  applicationId: string;
  localReady: boolean;
  isStarting: boolean;
  onBegin: () => void;
}> = ({ applicationId, localReady, isStarting, onBegin }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Device Check</h2>
        <div className="mb-6">
          <DevicePermissionGate applicationId={applicationId} />
        </div>
        <div className="flex flex-col gap-2">
          <PrimaryButton
            onClick={onBegin}
            disabled={!localReady || isStarting}
            label={
              isStarting
                ? 'Starting Interview...'
                : localReady
                  ? 'Start Interview'
                  : 'Waiting for Devices…'
            }
            loading={isStarting}
          />
          {!localReady && !isStarting && (
            <p className="text-xs text-neutral-400 text-center">
              Grant camera & microphone access to enable start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Diagnostics Modal
const DiagnosticsModal: React.FC<{
  applicationId: string;
  controller: ReturnType<typeof useInterviewController>;
  onClose: () => void;
}> = ({ applicationId, controller, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Diagnostics</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
            aria-label="Close diagnostics"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Bootstrap Info */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-2">
              Session Bootstrap
            </h3>
            <RealtimeSessionBootstrap applicationId={applicationId} />
          </div>

          {/* Feed Log - Debug only */}
          {process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1' && (
            <details className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-4">
              <summary className="text-sm font-semibold text-neutral-300 cursor-pointer hover:text-white transition">
                Feed Log (Debug)
              </summary>
              <div className="mt-3 max-h-96 overflow-y-auto">
                {controller.feed.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">
                    No feed events yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {controller.feed.map(item => (
                      <div
                        key={item.id}
                        className="text-[10px] font-mono bg-neutral-800/50 rounded p-2 border border-neutral-700"
                      >
                        <div className="text-neutral-400 mb-1">
                          [{new Date(item.ts).toLocaleTimeString()}]{' '}
                          <span className="text-emerald-400 uppercase">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-neutral-200">{item.text}</div>
                        {item.payload && (
                          <pre className="mt-1 text-neutral-500 overflow-x-auto">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

// Interviewer Panel (Top half of right column)
const InterviewerPanel: React.FC<{
  phase: string;
  isSpeaking: boolean;
  audioStream?: MediaStream | null;
}> = ({ phase, isSpeaking, audioStream }) => {
  return (
    <div className="relative w-full h-1/2 min-h-0 rounded-xl overflow-hidden bg-neutral-800/60 ring-1 ring-white/5 border border-white/10">
      {/* 3D Avatar Canvas */}
      <AIAvatarCanvas isSpeaking={isSpeaking} audioStream={audioStream} />

      {/* Label overlay */}
      <div className="absolute left-4 top-4 bg-neutral-900/70 backdrop-blur px-3 py-1 rounded-md text-[10px] uppercase tracking-wide text-neutral-200 ring-1 ring-white/10 pointer-events-none z-10">
        AI Interviewer
      </div>

      {/* Status indicator overlay */}
      {(phase === 'conducting' || phase === 'intro') && (
        <div className="absolute left-4 bottom-4 bg-indigo-600/80 backdrop-blur px-3 py-1 rounded-md text-[10px] font-medium text-white ring-1 ring-indigo-400/30 flex items-center gap-2 pointer-events-none z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {phase === 'intro' ? 'Starting...' : 'Active'}
        </div>
      )}
    </div>
  );
};

// Live Feedback Panel (Bottom half of right column)
const LiveFeedbackPanel: React.FC<{
  controller: ReturnType<typeof useInterviewController>;
  phase: string;
}> = ({ controller, phase }) => {
  if (phase === 'completed') {
    return (
      <div className="relative w-full h-1/2 min-h-0 rounded-xl overflow-hidden bg-emerald-600/10 ring-1 ring-emerald-500/30 border border-emerald-500/30 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold mb-2">
            Final Score
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold text-white">
              {controller.state.finalScore ?? '—'}
            </span>
            <span className="text-sm text-emerald-200">/100</span>
          </div>
          {controller.scoreBreakdown && (
            <>
              <div className="grid grid-cols-3 gap-3 text-xs text-neutral-200 mb-4">
                {Object.entries(controller.scoreBreakdown)
                  .filter(([k]) => k !== 'summary')
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="uppercase tracking-wide opacity-70 text-[10px]">
                        {k}
                      </span>
                      <span className="font-medium text-base">{v}</span>
                    </div>
                  ))}
              </div>
              {controller.scoreBreakdown.summary && (
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                  <p className="text-xs uppercase tracking-wide text-emerald-300/70 font-semibold mb-2">
                    Feedback
                  </p>
                  <p className="text-sm text-neutral-200 leading-relaxed">
                    {controller.scoreBreakdown.summary}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-1/2 min-h-0 rounded-xl overflow-hidden bg-neutral-800/60 ring-1 ring-white/5 border border-white/10 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Live Feedback</h3>
        {phase === 'pre_start' && (
          <p className="text-xs text-neutral-400">
            Feedback will appear here during the interview.
          </p>
        )}
        {(phase === 'intro' || phase === 'conducting') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Clarity</span>
              <span className="text-neutral-200 font-medium">—</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Correctness</span>
              <span className="text-neutral-200 font-medium">—</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Depth</span>
              <span className="text-neutral-200 font-medium">—</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">
              Real-time scoring coming soon...
            </p>
          </div>
        )}
        {phase === 'scoring' && (
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Calculating your score...
          </div>
        )}
      </div>
    </div>
  );
};
