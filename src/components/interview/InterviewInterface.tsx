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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Manager refs
  const videoManagerRef = useRef<VideoRecordingManager | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const websocketManagerRef = useRef<RealtimeWebSocketManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);

  // Initialize managers when permissions are granted
  const handlePermissionsGranted = useCallback(
    async (stream: MediaStream) => {
      try {
        setMediaStream(stream);
        setConnectionStatus('connecting');

        // Initialize audio context for playing AI responses
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });

        // Initialize video recording manager with existing stream
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
          }
        );

        // Set the stream we already have from permissions
        videoManagerRef.current.setMediaStream(stream);

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
            // Queue audio for playback
            audioQueueRef.current.push(audioData);
            playAudioQueue();
            setAIAudioLevel(0.8);
            setAISpeaking(true);
          },
          onAudioDone: () => {
            setAIAudioLevel(0);
            setAISpeaking(false);
          },
          onInputAudioBufferSpeechStarted: () => {
            // User started speaking
            setAISpeaking(false);
          },
          onInputAudioBufferSpeechStopped: () => {
            // User stopped speaking
          },
          onError: (err: Error) => {
            setError(err.message);
            setConnectionStatus('disconnected');
          },
        });

        await websocketManagerRef.current.connect();

        // Configure session with first question
        await websocketManagerRef.current.updateSession({
          instructions: `You are conducting a professional interview. Ask this question: "${questions[0]?.question}". Listen to the candidate's response and provide natural follow-up based on their answer.`,
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

  // Play audio queue from OpenAI
  const playAudioQueue = useCallback(async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const audioData = audioQueueRef.current.shift();
    if (!audioData) return;

    try {
      // Convert PCM16 to AudioBuffer
      const pcm16Data = new Int16Array(audioData);
      const floatData = new Float32Array(pcm16Data.length);

      // Convert Int16 to Float32 (-1 to 1 range)
      for (let i = 0; i < pcm16Data.length; i++) {
        floatData[i] = (pcm16Data[i] || 0) / 32768.0;
      }

      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        floatData.length,
        24000 // sample rate
      );

      audioBuffer.getChannelData(0).set(floatData);

      // Create and play buffer source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      // Schedule next chunk
      if (audioQueueRef.current.length > 0) {
        setTimeout(() => playAudioQueue(), 50);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  // Start interview
  const startInterview = async () => {
    try {
      if (!videoManagerRef.current || !mediaStream) {
        throw new Error('Recording manager not initialized');
      }

      await videoManagerRef.current.startRecording();
      setPhase('interviewing');
      setIsRecording(true);

      // Trigger AI to ask the first question
      if (websocketManagerRef.current) {
        websocketManagerRef.current.createResponse();
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
    }
  };

  // Move to next question
  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      // Update AI with next question
      if (websocketManagerRef.current) {
        await websocketManagerRef.current.updateSession({
          instructions: `Ask this question: "${questions[nextIndex]?.question}". Listen to the candidate's response and provide natural follow-up.`,
        });
      }
    } else {
      // All questions done
      await endInterview();
    }
  };

  // End interview
  const endInterview = async () => {
    try {
      setPhase('ending');

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Stop recording
      if (videoManagerRef.current) {
        videoManagerRef.current.stopRecording();
        const blob = videoManagerRef.current.getRecordedBlob();
        const duration = videoManagerRef.current.getDuration();

        if (blob) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);

          await new Promise((resolve, reject) => {
            reader.onloadend = async () => {
              try {
                const base64 = reader.result as string;

                // Upload recording
                const response = await fetch('/api/interview/end-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId,
                    duration,
                    recording: base64,
                    metadata: {
                      videoFormat: 'video/webm',
                      videoResolution: '1280x720',
                      frameRate: 30,
                    },
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to upload recording');
                }

                resolve(null);
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
          });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="h-24 w-24 text-green-500 mx-auto mb-6"
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
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Interview Complete!
          </h2>
          <p className="text-gray-600 mb-2">
            Thank you for completing the interview.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <p className="text-red-800 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Main Interview Interface */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Bar */}
        <InterviewStatus
          status={connectionStatus}
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          elapsedSeconds={elapsedSeconds}
          className="mb-6"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Video Preview */}
          <div className="lg:col-span-2">
            <VideoPreview
              stream={mediaStream}
              isReady={phase === 'ready' || phase === 'interviewing'}
              onToggleCamera={handleToggleCamera}
              onToggleMicrophone={handleToggleMicrophone}
              cameraEnabled={cameraEnabled}
              microphoneEnabled={microphoneEnabled}
            />

            {/* Audio Visualizer */}
            <div className="mt-4">
              <AudioVisualizer
                audioLevel={userAudioLevel}
                isActive={microphoneEnabled && isRecording}
                height={50}
              />
            </div>
          </div>

          {/* Right Column - Question & AI */}
          <div className="space-y-6">
            {/* AI Animation */}
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
              <AISpeakingAnimation
                isSpeaking={aiSpeaking}
                audioLevel={aiAudioLevel}
                size={120}
              />
            </div>

            {/* Current Question */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  {currentQuestion?.category} • {currentQuestion?.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {currentQuestion?.question}
              </h3>
              <p className="text-sm text-gray-600">
                Expected time: ~{currentQuestion?.expectedDuration}s
              </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-3">
              {phase === 'ready' && (
                <button
                  onClick={startInterview}
                  className="w-full btn-primary py-3 text-base font-medium"
                >
                  Start Interview
                </button>
              )}

              {phase === 'interviewing' && (
                <>
                  <button
                    onClick={nextQuestion}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-base font-medium transition-colors"
                  >
                    {currentQuestionIndex < questions.length - 1
                      ? 'Next Question'
                      : 'Complete Interview'}
                  </button>
                  <button
                    onClick={endInterview}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    End Early
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
