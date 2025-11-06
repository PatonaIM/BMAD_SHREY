'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useInterviewController } from './useInterviewController';
import { useCompositeRecording } from './useCompositeRecording';
import { uploadRecording } from '../../../services/interview/recordingUpload';
import { DevicePermissionGate } from './DevicePermissionGate';
import { applyLegacyTheme } from '../../../styles/legacyInterviewTheme';
import { RealtimeSessionBootstrap } from './RealtimeSessionBootstrap';
import { AIAvatarCanvas } from './AIAvatarCanvas';
import { EndInterviewModal } from './EndInterviewModal';

interface ModernInterviewPageProps {
  applicationId: string;
}

// Gradient applied inline; variable removed to satisfy unused var lint.

export const ModernInterviewPage: React.FC<ModernInterviewPageProps> = ({
  applicationId,
}) => {
  const controller = useInterviewController({ applicationId });
  const recording = useCompositeRecording({
    applicationId,
    enabled: true,
    progressiveUpload: true, // Enable progressive Azure upload during recording
  });

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startingStage, setStartingStage] = useState<
    | 'checking_device'
    | 'getting_token'
    | 'starting_session'
    | 'start_recording'
    | null
  >(null);
  const [localReady, setLocalReady] = useState(false);
  const [remoteAudioStream, setRemoteAudioStream] =
    useState<MediaStream | null>(null);
  const interviewRootRef = useRef<HTMLDivElement>(null);

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
      setStartingStage(null);
    }
  }, [phase, isStarting]);

  // Start recording after WebRTC connection is established (SDP exchange complete)
  const recordingStartedRef = useRef(false);
  useEffect(() => {
    // EP5-S21: Start recording when phase transitions to 'started'
    // This happens after SDP negotiation is complete
    if (
      phase === 'started' &&
      !recordingStartedRef.current &&
      interviewRootRef.current
    ) {
      recordingStartedRef.current = true;
      setStartingStage('start_recording');

      // eslint-disable-next-line no-console
      console.log('[Recording] Starting recording after SDP negotiation');

      recording.startRecording(interviewRootRef.current);

      // Clear the stage indicator after a brief moment
      setTimeout(() => {
        setStartingStage(null);
      }, 500);
    }
  }, [phase, recording]);

  const handleBegin = () => {
    setIsStarting(true);
    setStartingStage('checking_device');

    // Progress through stages with timing
    setTimeout(() => setStartingStage('getting_token'), 300);
    setTimeout(() => setStartingStage('starting_session'), 600);

    controller.begin();
  };

  const handleEndInterview = async () => {
    setShowEndModal(false);
    setIsEndingInterview(true);

    try {
      // Step 1: Stop recording and wait for all pending uploads
      // eslint-disable-next-line no-console
      console.log('[Interview] Stopping recording and waiting for uploads...');
      await recording.stopRecording();
      await recording.waitForCompletion();

      // Step 2: Get session ID and finalize video
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionId = (window as any).__interviewSessionId;
      let videoUrl: string | null = null;

      if (sessionId) {
        // eslint-disable-next-line no-console
        console.log('[Interview] Finalizing video...');
        videoUrl = await recording.finalizeAndGetUrl(sessionId);
      }

      // Step 3: Trigger scoring to calculate final score
      // eslint-disable-next-line no-console
      console.log('[Interview] Calculating score...');
      controller.endAndScore();

      // Step 4: Wait for score to be calculated
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 5: Update session status and persist scores + video URL via API
      if (sessionId) {
        const finalScore = controller.state.finalScore;
        const scoreBreakdown = controller.state.finalScoreBreakdown;

        // eslint-disable-next-line no-console
        console.log('[Interview] Updating session...', {
          finalScore,
          videoUrl,
        });

        await fetch('/api/interview/end-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            endedBy: 'candidate',
            reason: 'user_requested',
            finalScore,
            scoreBreakdown,
            videoUrl,
          }),
        });
      }

      // eslint-disable-next-line no-console
      console.log('[Interview] Interview ended successfully');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Interview] Failed to end interview:', err);
    } finally {
      setIsEndingInterview(false);
    }
  };

  // Update starting stage based on controller phase
  useEffect(() => {
    if (isStarting) {
      if (phase === 'started') {
        setStartingStage('start_recording');
      }
    }
  }, [phase, isStarting]);

  // Add AI audio stream to recording when it becomes available
  useEffect(() => {
    if (remoteAudioStream && recording.isRecording) {
      recording.addAiAudioStream(remoteAudioStream);
    }
  }, [remoteAudioStream, recording.isRecording, recording.addAiAudioStream]);

  // Stop recording when interview completes
  useEffect(() => {
    if (phase === 'completed' && recording.isRecording) {
      recording
        .stopRecording()
        .then(finalBlob => {
          // Skip final upload if progressive upload is enabled (already uploaded)
          if (finalBlob && recording.metadata && !recording.progressiveUpload) {
            // Upload recording to storage
            uploadRecording(
              applicationId,
              finalBlob,
              recording.metadata as unknown as Record<string, unknown>
            )
              .then(result => {
                if (result.success) {
                  // eslint-disable-next-line no-console
                  console.log('[Recording] Upload successful:', result.url);
                } else {
                  // eslint-disable-next-line no-console
                  console.error('[Recording] Upload failed:', result.error);
                }
              })
              .catch(err => {
                // eslint-disable-next-line no-console
                console.error('[Recording] Upload error:', err);
              });
          } else if (recording.progressiveUpload) {
            // eslint-disable-next-line no-console
            console.log(
              '[Recording] Skipping final upload - progressive upload already completed'
            );
          }
        })
        .catch(err => {
          // eslint-disable-next-line no-console
          console.error('[Recording] Stop error:', err);
        });
    }
  }, [phase, recording, applicationId]);

  // Auto-navigate to score screen when interview completes
  useEffect(() => {
    if (phase === 'completed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionId = (window as any).__interviewSessionId;
      if (sessionId) {
        // eslint-disable-next-line no-console
        console.log(
          '[Navigation] Interview completed, navigating to score screen...'
        );
        // Wait 2 seconds to show completion state, then navigate
        const timer = setTimeout(() => {
          window.location.href = `/interview/score/${sessionId}`;
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [phase]);

  const elapsedSeconds = (controller.elapsedMs / 1000).toFixed(1);

  const difficulty = controller.state.difficultyTier ?? 3;

  return (
    <div
      ref={interviewRootRef}
      id="interview-root"
      className="relative h-screen w-full overflow-hidden font-sans flex flex-col"
    >
      <div className="absolute inset-0 -z-10 opacity-40 blur-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
      <div className="absolute inset-0 -z-10 bg-neutral-950/80 backdrop-blur" />

      {/* Device Check Modal */}
      {phase === 'pre_start' && (
        <DeviceCheckModal
          applicationId={applicationId}
          localReady={localReady}
          isStarting={isStarting}
          startingStage={startingStage}
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

      {/* End Interview Confirmation Modal */}
      {showEndModal && (
        <EndInterviewModal
          onConfirm={handleEndInterview}
          onCancel={() => setShowEndModal(false)}
        />
      )}

      {/* Loading Overlay During End Interview Process */}
      {isEndingInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Ending Interview...
            </h3>
            <p className="text-sm text-neutral-400">
              Finalizing video and calculating your score
            </p>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className="flex-none px-4 pt-4">
        <HeaderBar
          applicationId={applicationId}
          elapsedSeconds={elapsedSeconds}
          phase={phase}
          difficulty={difficulty}
          onEndInterview={() => setShowEndModal(true)}
          onToggleDiagnostics={() => setShowDiagnostics(prev => !prev)}
          isRecording={recording.isRecording}
          recordingChunkCount={recording.chunkCount}
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

// Header with status + action buttons
const HeaderBar: React.FC<{
  applicationId: string;
  elapsedSeconds: string;
  phase: string;
  difficulty: number;
  onEndInterview: () => void;
  onToggleDiagnostics: () => void;
  isRecording?: boolean;
  recordingChunkCount?: number;
}> = ({
  applicationId,
  elapsedSeconds,
  phase,
  difficulty,
  onEndInterview,
  onToggleDiagnostics,
  isRecording = false,
  recordingChunkCount = 0,
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

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/30">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                REC {recordingChunkCount > 0 ? `(${recordingChunkCount})` : ''}
              </span>
            </div>
          )}

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

          {/* End Interview Button - visible after interview starts */}
          {phase !== 'pre_start' && phase !== 'completed' && (
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
      {phase === 'started' && (
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
  startingStage:
    | 'checking_device'
    | 'getting_token'
    | 'starting_session'
    | 'start_recording'
    | null;
  onBegin: () => void;
}> = ({ applicationId, localReady, isStarting, startingStage, onBegin }) => {
  const stageMessages = {
    checking_device: 'Checking Device',
    getting_token: 'Getting Token',
    starting_session: 'Starting Session',
    start_recording: 'Start Recording',
  };

  const stages = [
    'checking_device',
    'getting_token',
    'starting_session',
    'start_recording',
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Device Check</h2>
        <div className="mb-6">
          <DevicePermissionGate applicationId={applicationId} />
        </div>

        {/* 4-Stage Loading Progress */}
        {isStarting && startingStage && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-2">
              {stages.map((stage, idx) => {
                const currentIdx = stages.indexOf(startingStage);
                const stageIdx = idx;
                const isComplete = stageIdx < currentIdx;
                const isCurrent = stageIdx === currentIdx;

                return (
                  <div
                    key={stage}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      isComplete
                        ? 'bg-emerald-500'
                        : isCurrent
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-neutral-700'
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-sm text-neutral-300 text-center">
              {stageMessages[startingStage]}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <PrimaryButton
            onClick={onBegin}
            disabled={!localReady || isStarting}
            label={
              isStarting && startingStage
                ? stageMessages[startingStage]
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
}> = ({ isSpeaking, audioStream }) => {
  return (
    <div className="relative w-full h-1/2 min-h-0 rounded-xl overflow-hidden bg-neutral-800/60 ring-1 ring-white/5 border border-white/10">
      {/* 3D Avatar Canvas */}
      <AIAvatarCanvas isSpeaking={isSpeaking} audioStream={audioStream} />

      {/* Label overlay */}
      <div className="absolute left-4 top-4 bg-neutral-900/70 backdrop-blur px-3 py-1 rounded-md text-[10px] uppercase tracking-wide text-neutral-200 ring-1 ring-white/10 pointer-events-none z-10">
        AI Interviewer
      </div>

      {/* Status indicator overlay */}
    </div>
  );
};

// Live Feedback Panel (Bottom half of right column)
const LiveFeedbackPanel: React.FC<{
  controller: ReturnType<typeof useInterviewController>;
  phase: string;
}> = ({ controller, phase }) => {
  // EP5-S21: Live question scoring state
  const [latestScore, setLatestScore] = useState<{
    questionText: string;
    score: number;
    feedback: string;
  } | null>(null);
  const [scoreHistory, setScoreHistory] = useState<
    Array<{ questionText: string; score: number; feedback: string }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // Listen for question score events from AI
  useEffect(() => {
    const handleQuestionScore = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        questionText: string;
        score: number;
        feedback: string;
      };

      // Validate score is a number
      const validatedScore = {
        questionText: detail.questionText || 'Question',
        score:
          typeof detail.score === 'number' && !isNaN(detail.score)
            ? Math.round(detail.score)
            : 0,
        feedback: detail.feedback || 'No feedback',
      };

      setLatestScore(validatedScore);
      setScoreHistory(prev => [...prev, validatedScore]);
    };

    window.addEventListener(
      'interview:question_score',
      handleQuestionScore as EventListener
    );
    return () => {
      window.removeEventListener(
        'interview:question_score',
        handleQuestionScore as EventListener
      );
    };
  }, []);

  // Calculate running average
  const runningAverage =
    scoreHistory.length > 0
      ? Math.round(
          scoreHistory.reduce((sum, s) => sum + s.score, 0) /
            scoreHistory.length
        )
      : null;

  // Helper to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (phase === 'completed') {
    return (
      <div className="relative w-full h-1/2 min-h-0 max-h-[50%] rounded-xl overflow-hidden bg-emerald-600/10 ring-1 ring-emerald-500/30 border border-emerald-500/30 flex flex-col">
        <div className="flex-none px-6 pt-6 pb-3 border-b border-emerald-500/20">
          <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold">
            Final Score
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
    <div className="relative w-full h-1/2 min-h-0 max-h-[50%] rounded-xl overflow-hidden bg-neutral-800/60 ring-1 ring-white/5 border border-white/10 flex flex-col">
      <div className="flex-none px-6 pt-6 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Live Feedback</h3>

          {/* Running Average & History Toggle in Header */}
          {phase === 'started' && latestScore && (
            <div className="flex items-center gap-3">
              {/* Running Average */}
              {runningAverage !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">Avg:</span>
                  <span
                    className={`text-sm font-semibold ${getScoreColor(runningAverage)}`}
                  >
                    {runningAverage}
                  </span>
                </div>
              )}

              {/* History Toggle Button */}
              {scoreHistory.length > 1 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20"
                >
                  {showHistory ? '▼' : '▶'} History ({scoreHistory.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {phase === 'pre_start' && (
          <p className="text-xs text-neutral-400">
            Feedback will appear here during the interview.
          </p>
        )}
        {phase === 'started' && (
          <div className="space-y-4 max-h-full overflow-y-auto">
            {/* Latest Score */}
            {latestScore ? (
              <>
                <div className="bg-neutral-900/60 rounded-lg p-4 border border-white/5 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                      Latest Answer
                    </span>
                    <span
                      className={`text-2xl font-bold ${getScoreColor(latestScore.score)}`}
                    >
                      {latestScore.score}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mb-2 line-clamp-2">
                    {latestScore.questionText}
                  </p>
                  <p className="text-xs text-neutral-400 italic line-clamp-2">
                    {latestScore.feedback}
                  </p>
                </div>

                {/* History List - only shown when expanded */}
                {showHistory && scoreHistory.length > 1 && (
                  <div className="space-y-2 flex-shrink-0">
                    {scoreHistory.map((s, idx) => (
                      <div
                        key={idx}
                        className="bg-neutral-900/40 rounded p-2 border border-white/5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-neutral-500">
                            Q{idx + 1}
                          </span>
                          <span
                            className={`text-sm font-semibold ${getScoreColor(s.score)}`}
                          >
                            {s.score}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 line-clamp-2">
                          {s.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-neutral-400">
                Answer scores will appear here as you respond to questions...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
