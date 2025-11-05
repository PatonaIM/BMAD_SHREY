'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInterviewController } from './useInterviewController';
import { DevicePermissionGate } from './DevicePermissionGate';
import { applyLegacyTheme } from '../../../styles/legacyInterviewTheme';
import { RealtimeSessionBootstrap } from './RealtimeSessionBootstrap';

interface ModernInterviewPageProps {
  applicationId: string;
}

// Gradient applied inline; variable removed to satisfy unused var lint.

export const ModernInterviewPage: React.FC<ModernInterviewPageProps> = ({
  applicationId,
}) => {
  const controller = useInterviewController({ applicationId });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    applyLegacyTheme();
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [controller.feed.length]);

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
  const phase = controller.state.interviewPhase || 'pre_start';

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      <div className="absolute inset-0 -z-10 opacity-40 blur-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
      <div className="absolute inset-0 -z-10 bg-neutral-950/80 backdrop-blur" />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <HeaderBar
          applicationId={applicationId}
          elapsedSeconds={elapsedSeconds}
          phase={phase}
          difficulty={difficulty}
          progressPct={progressPct}
        />

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <VideoAndControls
              controller={controller}
              applicationId={applicationId}
            />
            <QuestionFeed controller={controller} scrollRef={scrollRef} />
          </div>
          <aside className="space-y-6">
            <PermissionCard applicationId={applicationId} />
            <ScoreCard controller={controller} />
            <DiagnosticsToggle
              show={showDiagnostics}
              onToggle={() => setShowDiagnostics(s => !s)}
            />
            {showDiagnostics && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-3">
                <RealtimeSessionBootstrap applicationId={applicationId} />
              </div>
            )}
          </aside>
        </div>
        <RemoteAIAudioPlayer />
      </div>
    </div>
  );
};

// Header with progress + status
const HeaderBar: React.FC<{
  applicationId: string;
  elapsedSeconds: string;
  phase: string;
  difficulty: number;
  progressPct: number;
}> = ({ applicationId, elapsedSeconds, phase, difficulty, progressPct }) => {
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

const VideoAndControls: React.FC<{
  controller: ReturnType<typeof useInterviewController>;
  applicationId: string;
}> = ({ controller }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Use interviewPhase instead of transport phase so UI reflects logical interview start
  const hasStarted = controller.state.interviewPhase !== 'pre_start';
  const phase = controller.state.interviewPhase || 'pre_start';
  const [localReady, setLocalReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__interviewV2LocalStream) setLocalReady(true);
    const handler = () => setLocalReady(true);
    window.addEventListener('interview:permissions_ready', handler);
    return () =>
      window.removeEventListener('interview:permissions_ready', handler);
  }, []);

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
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur shadow-2xl p-5 flex flex-col gap-5">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-800/60 ring-1 ring-white/5">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        {phase === 'pre_start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-neutral-900/70 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-2">
              Ready to Begin?
            </h2>
            <p className="text-sm text-neutral-300 max-w-sm mb-4">
              When you start, the AI interviewer will greet you and then begin
              adaptive questioning.
            </p>
            <div className="flex flex-col items-center gap-2 w-full">
              <PrimaryButton
                onClick={controller.begin}
                disabled={hasStarted || !localReady}
                label={localReady ? 'Start Interview' : 'Waiting for Devices…'}
              />
              {!localReady && (
                <p className="text-[11px] text-neutral-400">
                  Grant camera & microphone access to enable start.
                </p>
              )}
            </div>
          </div>
        )}
        {phase === 'conducting' && (
          <OverlayLabel text="Interview in Progress" />
        )}
        {phase === 'scoring' && <OverlayLabel text="Scoring..." />}
        {phase === 'completed' && <OverlayLabel text="Completed" />}
      </div>
      <div className="flex flex-wrap gap-3">
        {phase === 'conducting' && (
          <PrimaryButton
            onClick={controller.endAndScore}
            label="End & Score"
            variant="danger"
          />
        )}
        {phase === 'completed' && controller.state.finalScore != null && (
          <div className="text-sm text-neutral-300 flex items-center gap-2">
            <span className="font-semibold text-white text-lg">
              {controller.state.finalScore}
            </span>
            <span className="uppercase tracking-wide text-[10px] text-neutral-500">
              Score
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Hidden audio element that plays remote AI audio when stream becomes available
const RemoteAIAudioPlayer: React.FC = () => {
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
  }, []);

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

const QuestionFeed: React.FC<{
  controller: ReturnType<typeof useInterviewController>;
  scrollRef: React.RefObject<HTMLDivElement>;
}> = ({ controller, scrollRef }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-2xl p-5 h-[460px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Interview Feed</h3>
        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
          <span>
            Q{(controller.state.currentQuestionIndex ?? -1) + 1}/
            {controller.targetQuestions}
          </span>
          <span>|</span>
          <span>{(controller.elapsedMs / 1000).toFixed(0)}s</span>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar"
      >
        {controller.feed.map(item => (
          <FeedItem key={item.id} item={item} />
        ))}
        {!controller.feed.length && (
          <div className="text-xs text-neutral-500 pt-8 text-center">
            Awaiting greeting...
          </div>
        )}
      </div>
    </div>
  );
};

interface FeedItemProps {
  item: ReturnType<typeof useInterviewController>['feed'][number];
}
const FeedItem: React.FC<FeedItemProps> = ({ item }) => {
  const base =
    'rounded-lg px-3 py-2 text-xs shadow ring-1 ring-inset backdrop-blur';
  const variantMap: Record<string, string> = {
    greet: 'bg-indigo-500/15 ring-indigo-400/30 text-indigo-200',
    question: 'bg-fuchsia-500/15 ring-fuchsia-400/30 text-fuchsia-200',
    score: 'bg-emerald-500/15 ring-emerald-400/30 text-emerald-200',
    done: 'bg-slate-500/15 ring-slate-400/30 text-slate-200',
    info: 'bg-neutral-500/10 ring-neutral-400/20 text-neutral-300',
  };
  const style = variantMap[item.type] || variantMap.info;
  return (
    <div className={`${base} ${style}`}>
      <div className="font-medium leading-tight mb-1 capitalize">
        {item.type.replace(/_/g, ' ')}
      </div>
      <div className="leading-snug whitespace-pre-wrap">{item.text}</div>
      {item.type === 'score' && item.payload != null && (
        <pre className="mt-2 text-[10px] opacity-70 overflow-x-auto">
          {JSON.stringify(item.payload, null, 2)}
        </pre>
      )}
    </div>
  );
};

const PermissionCard: React.FC<{ applicationId: string }> = ({
  applicationId,
}) => (
  <div className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-xl p-4">
    <h3 className="text-sm font-semibold text-white mb-3">Device Check</h3>
    <DevicePermissionGate applicationId={applicationId} />
  </div>
);

const ScoreCard: React.FC<{
  controller: ReturnType<typeof useInterviewController>;
}> = ({ controller }) => {
  if (controller.state.interviewPhase !== 'completed') {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-xl p-4 text-xs text-neutral-400">
        <p className="font-semibold text-neutral-200 mb-1">Score</p>
        <p>Score will appear here after completion.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-600/10 backdrop-blur shadow-xl p-4">
      <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold mb-2">
        Final Score
      </p>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-white">
          {controller.state.finalScore ?? '—'}
        </span>
        <span className="text-xs text-emerald-200">/100</span>
      </div>
      {controller.scoreBreakdown && (
        <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-200">
          {Object.entries(controller.scoreBreakdown).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="uppercase tracking-wide opacity-70">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DiagnosticsToggle: React.FC<{ show: boolean; onToggle: () => void }> = ({
  show,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    className="w-full rounded-xl border border-white/10 bg-neutral-800/60 hover:bg-neutral-800/80 transition text-xs py-2 text-neutral-300"
  >
    {show ? 'Hide Diagnostics' : 'Show Diagnostics'}
  </button>
);

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
}> = ({ label, onClick, disabled, variant = 'primary' }) => {
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
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
    >
      {label}
    </button>
  );
};

const OverlayLabel: React.FC<{ text: string }> = ({ text }) => (
  <div className="absolute left-4 top-4 bg-neutral-900/70 backdrop-blur px-3 py-1 rounded-md text-[10px] uppercase tracking-wide text-neutral-200 ring-1 ring-white/10">
    {text}
  </div>
);
