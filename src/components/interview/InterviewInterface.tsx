'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VideoRecordingManager } from '../../services/media/videoRecordingManager';
import { AudioProcessor } from '../../services/media/audioProcessor';
import { RealtimeWebSocketManager } from '../../services/ai/realtimeWebSocket';
import { VideoPreview } from './VideoPreview';
import { AudioVisualizer } from './AudioVisualizer';
import { AISpeakingAnimation } from './AISpeakingAnimation';
import { InterviewStatus } from './InterviewStatus';
import { CameraPermissionCheck } from './CameraPermissionCheck';
import type { InterviewQuestion } from '../../shared/types/interview';

interface InterviewInterfaceProps {
  sessionId: string;
  questions: InterviewQuestion[];
}

type InterviewPhase =
  | 'setup'
  | 'ready'
  | 'interviewing'
  | 'ending'
  | 'complete';

export function InterviewInterface({
  sessionId,
  questions,
}: InterviewInterfaceProps) {
  const router = useRouter();

  // Phase management
  const [phase, setPhase] = useState<InterviewPhase>('setup');

  // Media state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Audio levels
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [aiAudioLevel, setAIAudioLevel] = useState(0);
  const [aiSpeaking, setAISpeaking] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'recording' | 'paused'
  >('connecting');

  // Scoring state
  const [localScores, setLocalScores] = useState<{
    technical: number;
    communication: number;
    experience: number;
    overall: number;
    confidence: number;
  } | null>(null);

  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Manager refs
  const videoManagerRef = useRef<VideoRecordingManager | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const websocketManagerRef = useRef<RealtimeWebSocketManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const aiAudioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(
    null
  );
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const playbackCursorRef = useRef<number>(0);
  const schedulingRef = useRef<boolean>(false);

  // Inactivity monitoring refs
  const lastSpeechTimestampRef = useRef<number>(Date.now());
  const silenceWarningIssuedRef = useRef<boolean>(false);
  const inactivityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Streaming upload refs
  const uploadedBlockIds = useRef<string[]>([]);
  const totalFileSize = useRef<number>(0);
  const collectedChunks = useRef<Blob[]>([]);
  const uploadQueue = useRef<Blob[]>([]);
  const isUploadingRef = useRef<boolean>(false);

  // Initialize managers when permissions are granted
  const handlePermissionsGranted = useCallback(
    async (stream: MediaStream) => {
      try {
        setMediaStream(stream);
        setConnectionStatus('connecting');

        // Initialize audio context for playing AI responses
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });

        // Create destination for capturing AI audio to mix into recording
        aiAudioDestinationRef.current =
          audioContextRef.current.createMediaStreamDestination();

        // Sequential upload queue processor
        const processUploadQueue = async () => {
          if (isUploadingRef.current || uploadQueue.current.length === 0) {
            return;
          }

          isUploadingRef.current = true;

          while (uploadQueue.current.length > 0) {
            const chunkToUpload = uploadQueue.current.shift();
            if (!chunkToUpload) break;

            try {
              // Create block ID
              const blockIndex = uploadedBlockIds.current.length;
              const blockId = btoa(
                `block-${blockIndex.toString().padStart(10, '0')}`
              );

              const formData = new FormData();
              formData.append('chunk', chunkToUpload);
              formData.append('sessionId', sessionId);
              formData.append('blockId', blockId);
              formData.append('isFirst', blockIndex === 0 ? 'true' : 'false');

              const response = await fetch('/api/interview/upload-chunk', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                throw new Error('Failed to upload chunk');
              }

              uploadedBlockIds.current.push(blockId);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Chunk upload failed';
              setError(`Upload error: ${message}`);
              // Re-queue for retry
              uploadQueue.current.unshift(chunkToUpload);
              break;
            }
          }

          isUploadingRef.current = false;

          // Check if there are more chunks to process
          if (uploadQueue.current.length > 0) {
            setTimeout(() => processUploadQueue(), 100);
          }
        };

        // Initialize video recording manager with chunk collection
        videoManagerRef.current = new VideoRecordingManager(
          {
            video: { width: 1280, height: 720, frameRate: 30 },
            audio: { echoCancellation: true, noiseSuppression: true },
          },
          {
            onStateChange: state => {
              if (state === 'recording') {
                setIsRecording(true);
                setConnectionStatus('recording');
              } else if (state === 'paused') {
                setConnectionStatus('paused');
              }
            },
            onError: err => setError(err.message),
            onDataAvailable: chunk => {
              // Collect chunk locally for final blob creation
              collectedChunks.current.push(chunk);
              totalFileSize.current += chunk.size;

              // Split chunk into 2MB pieces for upload
              const chunkSize = 2 * 1024 * 1024;
              let offset = 0;

              while (offset < chunk.size) {
                const piece = chunk.slice(
                  offset,
                  Math.min(offset + chunkSize, chunk.size)
                );
                uploadQueue.current.push(piece);
                offset += chunkSize;
              }

              // Trigger queue processing
              processUploadQueue();
            },
          }
        );

        // Set the camera/microphone stream
        videoManagerRef.current.setMediaStream(stream);

        // Set the AI audio stream for mixing into recording
        if (aiAudioDestinationRef.current) {
          videoManagerRef.current.setAdditionalAudioStream(
            aiAudioDestinationRef.current.stream
          );
        }

        // Initialize audio processor
        audioProcessorRef.current = await AudioProcessor.createFromStream(
          stream,
          { sampleRate: 24000, channels: 1 },
          {
            onAudioLevel: level => setUserAudioLevel(level),
            onAudioData: audioData => {
              // Send audio to WebSocket when interviewing
              if (
                websocketManagerRef.current &&
                websocketManagerRef.current.isConnected()
              ) {
                websocketManagerRef.current.sendAudio(audioData);
              }
            },
            onError: err => setError(err.message),
          }
        );

        // Get realtime token
        const tokenResponse = await fetch('/api/interview/realtime-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to get realtime token');
        }

        const tokenData = await tokenResponse.json();
        const token = tokenData.value.token;

        // Initialize WebSocket manager
        websocketManagerRef.current = new RealtimeWebSocketManager(token, {
          onAudioDelta: (audioData: ArrayBuffer) => {
            // Queue audio for playback (animation sync handled in playAudioQueue)
            audioQueueRef.current.push(audioData);
            playAudioQueue();
            setAIAudioLevel(0.8);
          },
          onAudioDone: () => {
            setAIAudioLevel(0);
            // Animation stop is handled by playAudioQueue timing
          },
          onInputAudioBufferSpeechStarted: () => {
            // User started speaking - update timestamp
            lastSpeechTimestampRef.current = Date.now();
            silenceWarningIssuedRef.current = false;
            setAISpeaking(false);
          },
          onInputAudioBufferSpeechStopped: () => {
            // User stopped speaking - update timestamp
            lastSpeechTimestampRef.current = Date.now();
          },
          onFunctionCall: (functionName: string) => {
            // Handle function calls from AI
            if (functionName === 'end_interview') {
              // User requested to end interview
              endInterview();
            }
          },
          onError: (err: Error) => {
            setError(err.message);
            setConnectionStatus('disconnected');
          },
        });

        await websocketManagerRef.current.connect();

        // Configure session with greeting and dynamic question generation
        await websocketManagerRef.current.updateSession({
          instructions: `You are a concise, professional AI interviewer. Keep ALL responses under 20 words.

GREETING: "Hi! I'm your AI interviewer. Let's discuss your skills and experience. Ready to begin?"

STYLE:
- One brief question at a time (max 15 words)
- Listen more, talk less
- No repetition - never ask same question twice
- Be direct and specific
- Skip pleasantries after greeting

QUESTION MIX:
- Technical skills
- Problem-solving approach
- Past projects
- Team collaboration

AFTER 5-7 MIN: "Thanks for your time today. That's all I need. Great talking with you!"

CRITICAL: If candidate says "end interview", "stop", "I'm done", or "finish", immediately respond: "Understood. Ending interview now. Thank you!" then call the end_interview function.

Start with greeting only.`,
          voice: 'alloy',
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            silence_duration_ms: 700,
            prefix_padding_ms: 300,
          },
          tools: [
            {
              type: 'function',
              name: 'end_interview',
              description:
                'Call this function when the candidate explicitly requests to end the interview by saying phrases like "end interview", "stop", "finish", "I\'m done", or similar',
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          ],
        });

        setConnectionStatus('connected');
        setPhase('ready');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Setup failed';
        setError(message);
        setConnectionStatus('disconnected');
      }
    },
    [sessionId, questions]
  );

  const handlePermissionsDenied = useCallback((err: Error) => {
    setError(err.message);
    setConnectionStatus('disconnected');
  }, []);

  // Sequential scheduling playback to prevent overlapping sources (which sounds like multiple voices)
  const playAudioQueue = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (schedulingRef.current) return;
    if (audioQueueRef.current.length === 0) return;

    schedulingRef.current = true;
    let cursor = playbackCursorRef.current;
    const now = ctx.currentTime;
    if (cursor < now) cursor = now;

    let isFirstChunk = cursor === now; // First chunk in sequence
    let lastEndTime = cursor;

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (!chunk) break;
      const pcm16 = new Int16Array(chunk);
      const floatData = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        floatData[i] = (pcm16[i] ?? 0) / 32768.0;
      }
      const buffer = ctx.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);

      // Also connect to AI audio destination for recording
      if (aiAudioDestinationRef.current) {
        src.connect(aiAudioDestinationRef.current);
      }

      // Start animation when first chunk starts playing
      if (isFirstChunk) {
        const startDelay = (cursor - now) * 1000; // Convert to milliseconds
        setTimeout(() => {
          setAISpeaking(true);
        }, startDelay);
        isFirstChunk = false;
      }

      src.start(cursor);
      cursor += buffer.duration;
      lastEndTime = cursor;
    }

    // Stop animation when all audio finishes
    const totalDuration = (lastEndTime - now) * 1000; // Convert to milliseconds
    setTimeout(() => {
      // Only stop if no new audio has been scheduled
      if (audioQueueRef.current.length === 0) {
        setAISpeaking(false);
        setAIAudioLevel(0);
      }
    }, totalDuration);

    playbackCursorRef.current = cursor;
    schedulingRef.current = false;
  }, []);

  // Start interview
  const startInterview = async () => {
    try {
      if (!videoManagerRef.current) {
        throw new Error('Video recorder not initialized');
      }

      // Reset tracking
      uploadedBlockIds.current = [];
      totalFileSize.current = 0;
      collectedChunks.current = [];
      uploadQueue.current = [];
      isUploadingRef.current = false;

      await videoManagerRef.current.startRecording();
      setPhase('interviewing');
      setIsRecording(true);

      // Initialize speech timestamp
      lastSpeechTimestampRef.current = Date.now();

      // Trigger AI to start with greeting
      if (websocketManagerRef.current) {
        websocketManagerRef.current.createResponse();
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // Start inactivity monitoring (check every 5 seconds)
      inactivityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const silenceDuration = (now - lastSpeechTimestampRef.current) / 1000;

        if (silenceDuration > 45) {
          // 45 seconds of silence - end interview
          endInterview();
        } else if (silenceDuration > 25 && !silenceWarningIssuedRef.current) {
          // 25 seconds - warn user
          silenceWarningIssuedRef.current = true;
          if (websocketManagerRef.current) {
            websocketManagerRef.current.updateSession({
              instructions:
                'The candidate has been quiet for a while. Gently ask if they need clarification or if everything is okay.',
            });
            websocketManagerRef.current.createResponse();
          }
        }
      }, 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
    }
  };

  // End interview
  const endInterview = async () => {
    try {
      setPhase('ending');

      // Stop timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (inactivityCheckIntervalRef.current) {
        clearInterval(inactivityCheckIntervalRef.current);
      }

      // Calculate stub scores based on interview duration
      const duration = elapsedSeconds;
      const durationMinutes = duration / 60;

      // Simple heuristic: longer interviews (up to 10 min) = better scores
      const durationFactor = Math.min(durationMinutes / 10, 1);
      const baseScore = 60 + durationFactor * 30; // 60-90 range

      const scores = {
        technical: Math.round(baseScore + Math.random() * 10),
        communication: Math.round(baseScore + Math.random() * 10),
        experience: Math.round(baseScore + Math.random() * 10),
        overall: Math.round(baseScore + Math.random() * 10),
        confidence: Math.round(70 + Math.random() * 20),
      };

      setLocalScores(scores);

      // Stop recording
      if (videoManagerRef.current) {
        videoManagerRef.current.stopRecording();
        const recordingDuration = videoManagerRef.current.getDuration();

        // Wait for any pending uploads to complete
        if (uploadQueue.current.length > 0) {
          setError('Finishing upload... Please wait.');

          // Wait for upload queue to empty
          let attempts = 0;
          while (uploadQueue.current.length > 0 && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }

          if (uploadQueue.current.length > 0) {
            throw new Error(
              'Upload timeout - some chunks may not have uploaded'
            );
          }
        }

        // Finalize upload with already uploaded blocks
        if (uploadedBlockIds.current.length > 0) {
          const response = await fetch('/api/interview/finalize-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              blockIds: uploadedBlockIds.current,
              duration: Math.floor(recordingDuration / 1000), // Convert ms to seconds
              fileSize: totalFileSize.current,
              videoFormat: 'video/webm',
              videoResolution: '1280x720',
              frameRate: 30,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to finalize recording');
          }

          // Update scores in database
          await fetch('/api/interview/update-scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, scores }),
          });

          setError(null);
        }
      }

      // Cleanup
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop();
      }
      if (websocketManagerRef.current) {
        websocketManagerRef.current.disconnect();
      }
      if (videoManagerRef.current) {
        videoManagerRef.current.release();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      setPhase('complete');

      // Redirect after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end interview');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (inactivityCheckIntervalRef.current)
        clearInterval(inactivityCheckIntervalRef.current);
      if (audioProcessorRef.current) audioProcessorRef.current.stop();
      if (websocketManagerRef.current) websocketManagerRef.current.disconnect();
      if (videoManagerRef.current) videoManagerRef.current.release();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Toggle camera
  const handleToggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle microphone
  const handleToggleMicrophone = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicrophoneEnabled(audioTrack.enabled);
      }
    }
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <CameraPermissionCheck
          onPermissionsGranted={handlePermissionsGranted}
          onPermissionsDenied={handlePermissionsDenied}
        />
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-700">
          {/* Success Icon with animated rings */}
          <div className="relative mb-8 inline-block">
            <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
            <svg
              className="h-28 w-28 text-green-400 mx-auto relative z-10 drop-shadow-2xl animate-in zoom-in duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 animate-in slide-in-from-bottom duration-500">
            Interview Complete! 🎉
          </h2>
          <p className="text-xl text-green-200 mb-8 animate-in slide-in-from-bottom duration-500 delay-100">
            Thank you for completing the interview.
          </p>

          {/* Display Scores with Enhanced Styling */}
          {localScores && (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-8 ring-2 ring-white/20 animate-in slide-in-from-bottom duration-500 delay-200">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-2">
                <svg
                  className="w-7 h-7 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Your Score
              </h3>

              {/* Overall Score - Large Display */}
              <div className="mb-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-xl" />
                  <div className="text-7xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10 drop-shadow-lg">
                    {localScores.overall}%
                  </div>
                </div>
                <div className="text-lg text-blue-200 mt-3 font-medium">
                  Overall Score
                </div>
              </div>

              {/* Score Breakdown - Enhanced Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-blue-300 mb-2">
                    {localScores.technical}%
                  </div>
                  <div className="text-sm text-blue-200/80 flex items-center justify-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Technical
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-green-300 mb-2">
                    {localScores.communication}%
                  </div>
                  <div className="text-sm text-green-200/80 flex items-center justify-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Communication
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-purple-300 mb-2">
                    {localScores.experience}%
                  </div>
                  <div className="text-sm text-purple-200/80 flex items-center justify-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                    Experience
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-green-300/80 animate-pulse">
            <svg
              className="animate-spin h-5 w-5"
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
            <span className="text-sm font-medium">
              Redirecting to dashboard...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/90 backdrop-blur-sm border-b border-red-400 px-4 py-3 animate-in slide-in-from-top duration-300">
          <p className="text-white text-sm text-center font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Enhanced Header with Controls */}
      <div className="px-6 py-4 bg-white/5 backdrop-blur-lg border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <InterviewStatus
            status={connectionStatus}
            currentQuestion={1}
            totalQuestions={1}
            elapsedSeconds={elapsedSeconds}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {phase === 'ready' && (
            <button
              onClick={startInterview}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-green-500/50 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Start Interview
            </button>
          )}

          {phase === 'interviewing' && (
            <button
              onClick={endInterview}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              End Interview
            </button>
          )}
        </div>
      </div>

      {/* Main Interview Interface - Equal Split with Enhanced Styling */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Candidate Video (Left/Top - 50%) */}
        <div className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-left duration-500 min-h-0">
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
            <VideoPreview
              stream={mediaStream}
              isReady={phase === 'ready' || phase === 'interviewing'}
              onToggleCamera={handleToggleCamera}
              onToggleMicrophone={handleToggleMicrophone}
              cameraEnabled={cameraEnabled}
              microphoneEnabled={microphoneEnabled}
            />
          </div>

          {/* Compact Audio Visualizer */}
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-lg px-4 py-2.5 shadow-lg ring-1 ring-white/10 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <span className="text-xs font-medium text-white/90">
                Your Audio
              </span>
            </div>
            <div className="flex-1">
              <AudioVisualizer
                audioLevel={userAudioLevel}
                isActive={microphoneEnabled && isRecording}
                height={32}
              />
            </div>
          </div>
        </div>

        {/* AI Interviewer (Right/Bottom - 50%) */}
        <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-500 min-h-0">
          {/* AI Animation with Enhanced Container */}
          <div className="flex-1 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-xl rounded-2xl shadow-2xl ring-2 ring-white/20 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500 rounded-full blur-3xl animate-pulse animation-delay-1000" />
            </div>

            <div className="relative z-10">
              <AISpeakingAnimation
                isSpeaking={aiSpeaking}
                audioLevel={aiAudioLevel}
                size={200}
              />
            </div>

            <div className="mt-8 text-center relative z-10">
              <p className="text-xl font-semibold text-white mb-2">
                {phase === 'ready' ? '🎯 Ready to Begin' : '🤖 AI Interviewer'}
              </p>
              <p className="text-sm text-blue-200/80">
                {phase === 'ready'
                  ? "Click start when you're ready"
                  : aiSpeaking
                    ? '🎤 AI is speaking...'
                    : '👂 Listening...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
