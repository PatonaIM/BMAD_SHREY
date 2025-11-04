/**
 * AIInterviewPanel Component
 * Left panel: Manages OpenAI Realtime interview conversation
 */

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { RealtimeWebSocketManager } from '../../../services/ai/realtimeWebSocket';
import { AISpeakingAnimation } from '../shared/AISpeakingAnimation';
import { AudioVisualizer } from '../shared/AudioVisualizer';
import { useInterviewContext } from '../context/InterviewContext';
import { useQuestionFlow } from '../hooks/useQuestionFlow';

export interface AIInterviewPanelProps {
  onQuestionAsked?: (_questionText: string, _category: string) => void;
}

export function AIInterviewPanel({ onQuestionAsked }: AIInterviewPanelProps) {
  const {
    sharedState,
    audioState,
    setConnectionStatus,
    setError,
    setAISpeaking,
    setAIAudioLevel,
  } = useInterviewContext();

  const { detectQuestion, handleQuestionAsked } = useQuestionFlow({
    onQuestionAsked: question => {
      onQuestionAsked?.(question.text, question.category);
    },
  });

  const websocketManagerRef = useRef<RealtimeWebSocketManager | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const aiAudioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(
    null
  );
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const playbackCursorRef = useRef<number>(0);
  const schedulingRef = useRef<boolean>(false);
  const aiTranscriptBufferRef = useRef<string>('');

  // Initialize OpenAI Realtime WebSocket
  const initializeWebSocket = useCallback(async () => {
    if (!audioState.mediaStream || websocketManagerRef.current) return;

    try {
      setConnectionStatus('connecting');

      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      aiAudioDestinationRef.current =
        audioContextRef.current.createMediaStreamDestination();

      // Get realtime token
      const tokenResponse = await fetch('/api/interview/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sharedState.sessionId }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get realtime token');
      }

      const tokenData = await tokenResponse.json();
      const token = tokenData.value.token;

      // Initialize WebSocket manager
      websocketManagerRef.current = new RealtimeWebSocketManager(token, {
        onAudioDelta: (audioData: ArrayBuffer) => {
          audioQueueRef.current.push(audioData);
          playAudioQueue();
          setAIAudioLevel(0.8);
          setAISpeaking(true);
        },
        onAudioDone: () => {
          setAIAudioLevel(0);
          setAISpeaking(false);
          aiTranscriptBufferRef.current = '';
        },
        onAudioTranscriptDelta: (delta: string) => {
          aiTranscriptBufferRef.current += delta;
        },
        onAudioTranscriptDone: (transcript: string) => {
          if (transcript && transcript.trim().length > 0) {
            const questionText = transcript.trim();
            if (detectQuestion(questionText)) {
              handleQuestionAsked(questionText);
            }
          }
          aiTranscriptBufferRef.current = '';
        },
        onUserTranscriptDelta: () => {
          // User transcript handled elsewhere
        },
        onUserTranscriptDone: () => {
          // User transcript handled elsewhere
        },
        onInputAudioBufferSpeechStarted: () => {
          setAISpeaking(false);
        },
        onInputAudioBufferSpeechStopped: () => {
          // Speech stopped
        },
        onFunctionCall: (functionName: string) => {
          if (functionName === 'end_interview') {
            // Handle end interview
          }
        },
        onError: (err: Error) => {
          setError(err.message);
          setConnectionStatus('disconnected');
        },
      });

      await websocketManagerRef.current.connect();

      // Configure session
      await websocketManagerRef.current.updateSession({
        instructions: `You are a concise, professional AI interviewer. Keep ALL responses under 20 words.

IMPORTANT: DO NOT speak until the interview officially starts. Wait for the start signal.

GREETING (when interview starts): "Hi! I'm your AI interviewer. Let's discuss your skills and experience. Ready to begin?"

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

AFTER 5-7 MIN: "Thanks for your time today. That's all I need. Great talking with you!"`,
        voice: 'alloy',
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
        inputAudioTranscription: {
          model: 'whisper-1',
        },
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
              'Call this function when the candidate explicitly requests to end the interview',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      });

      setConnectionStatus('connected');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'WebSocket setup failed';
      setError(message);
      setConnectionStatus('disconnected');
    }
  }, [
    audioState.mediaStream,
    sharedState.sessionId,
    setConnectionStatus,
    setError,
    setAISpeaking,
    setAIAudioLevel,
    detectQuestion,
    handleQuestionAsked,
  ]);

  // Play audio queue
  const playAudioQueue = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || schedulingRef.current || audioQueueRef.current.length === 0)
      return;

    schedulingRef.current = true;
    let cursor = playbackCursorRef.current;
    const now = ctx.currentTime;
    if (cursor < now) cursor = now;

    let isFirstChunk = cursor === now;
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

      if (aiAudioDestinationRef.current) {
        src.connect(aiAudioDestinationRef.current);
      }

      if (isFirstChunk) {
        const startDelay = (cursor - now) * 1000;
        setTimeout(() => {
          setAISpeaking(true);
        }, startDelay);
        isFirstChunk = false;
      }

      src.start(cursor);
      cursor += buffer.duration;
      lastEndTime = cursor;
    }

    const totalDuration = (lastEndTime - now) * 1000;
    setTimeout(() => {
      if (audioQueueRef.current.length === 0) {
        setAISpeaking(false);
        setAIAudioLevel(0);
      }
    }, totalDuration);

    playbackCursorRef.current = cursor;
    schedulingRef.current = false;
  }, [setAISpeaking, setAIAudioLevel]);

  // Start AI greeting when ready
  const startAIGreeting = useCallback(() => {
    if (websocketManagerRef.current && sharedState.phase === 'interviewing') {
      websocketManagerRef.current.createResponse();
    }
  }, [sharedState.phase]);

  // Initialize when media stream is available
  useEffect(() => {
    if (audioState.mediaStream && sharedState.phase === 'ready') {
      initializeWebSocket();
    }
  }, [audioState.mediaStream, sharedState.phase, initializeWebSocket]);

  // Start greeting when interview starts
  useEffect(() => {
    if (sharedState.phase === 'interviewing') {
      startAIGreeting();
    }
  }, [sharedState.phase, startAIGreeting]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (websocketManagerRef.current) {
        websocketManagerRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex-1 bg-gradient-to-br from-[#A16AE8]/10 to-[#8096FD]/10 dark:from-[#A16AE8]/20 dark:to-[#8096FD]/20 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col items-center justify-center p-8">
      {/* AI Speaking Animation */}
      <AISpeakingAnimation
        isSpeaking={audioState.aiSpeaking}
        audioLevel={audioState.aiAudioLevel}
        size={180}
      />

      {/* Status Text */}
      <div className="mt-6 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {sharedState.phase === 'ready' ? 'Ready to Begin' : 'AI Interviewer'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {sharedState.phase === 'ready'
            ? "Click start when you're ready"
            : audioState.aiSpeaking
              ? 'Speaking...'
              : 'Listening...'}
        </p>
      </div>

      {/* Audio Level Indicator */}
      {sharedState.phase === 'interviewing' && (
        <div className="mt-4 w-32">
          <AudioVisualizer
            audioLevel={audioState.userAudioLevel}
            isActive={audioState.microphoneEnabled}
            height={24}
          />
        </div>
      )}
    </div>
  );
}
