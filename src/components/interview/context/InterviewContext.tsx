/**
 * Interview Context
 * Provides shared state and actions for the split-panel interview system
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import type {
  InterviewContextValue,
  InterviewSharedState,
  AudioStreamState,
  QuestionFlowState,
  InterviewPhase,
  ConnectionStatus,
  CurrentQuestion,
} from '../types/interview.types';

const InterviewContext = createContext<InterviewContextValue | null>(null);

export interface InterviewProviderProps {
  sessionId: string;
  children: ReactNode;
  onInterviewStart?: () => Promise<void>;
  onInterviewEnd?: () => Promise<void>;
}

export function InterviewProvider({
  sessionId,
  children,
  onInterviewStart,
  onInterviewEnd,
}: InterviewProviderProps) {
  // Shared state
  const [sharedState, setSharedState] = useState<InterviewSharedState>({
    sessionId,
    phase: 'setup',
    currentQuestion: null,
    elapsedSeconds: 0,
    isRecording: false,
    connectionStatus: 'connecting',
    error: null,
  });

  // Audio state
  const [audioState, setAudioState] = useState<AudioStreamState>({
    userAudioLevel: 0,
    aiAudioLevel: 0,
    aiSpeaking: false,
    mediaStream: null,
    cameraEnabled: true,
    microphoneEnabled: true,
  });

  // Question flow state
  const [questionFlow, setQuestionFlow] = useState<QuestionFlowState>({
    totalQuestions: 0,
    currentQuestionNumber: 0,
    questionsAsked: [],
  });

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Shared state actions
  const setPhase = useCallback((phase: InterviewPhase) => {
    setSharedState(prev => ({ ...prev, phase }));
  }, []);

  const setConnectionStatus = useCallback((status: ConnectionStatus) => {
    setSharedState(prev => ({ ...prev, connectionStatus: status }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setSharedState(prev => ({ ...prev, error }));
  }, []);

  const setCurrentQuestion = useCallback((question: CurrentQuestion | null) => {
    setSharedState(prev => ({ ...prev, currentQuestion: question }));
  }, []);

  const incrementElapsedTime = useCallback(() => {
    setSharedState(prev => ({
      ...prev,
      elapsedSeconds: prev.elapsedSeconds + 1,
    }));
  }, []);

  const setRecording = useCallback((isRecording: boolean) => {
    setSharedState(prev => ({ ...prev, isRecording }));
  }, []);

  // Audio actions
  const setUserAudioLevel = useCallback((level: number) => {
    setAudioState(prev => ({ ...prev, userAudioLevel: level }));
  }, []);

  const setAIAudioLevel = useCallback((level: number) => {
    setAudioState(prev => ({ ...prev, aiAudioLevel: level }));
  }, []);

  const setAISpeaking = useCallback((speaking: boolean) => {
    setAudioState(prev => ({ ...prev, aiSpeaking: speaking }));
  }, []);

  const setMediaStream = useCallback((stream: MediaStream | null) => {
    setAudioState(prev => ({ ...prev, mediaStream: stream }));
  }, []);

  const toggleCamera = useCallback(() => {
    if (audioState.mediaStream) {
      const videoTrack = audioState.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setAudioState(prev => ({ ...prev, cameraEnabled: videoTrack.enabled }));
      }
    }
  }, [audioState.mediaStream]);

  const toggleMicrophone = useCallback(() => {
    if (audioState.mediaStream) {
      const audioTrack = audioState.mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioState(prev => ({
          ...prev,
          microphoneEnabled: audioTrack.enabled,
        }));
      }
    }
  }, [audioState.mediaStream]);

  // Question flow actions
  const onQuestionAsked = useCallback(
    (question: CurrentQuestion) => {
      setCurrentQuestion(question);
      setQuestionFlow(prev => ({
        totalQuestions: prev.totalQuestions + 1,
        currentQuestionNumber: prev.totalQuestions + 1,
        questionsAsked: [...prev.questionsAsked, question],
      }));
    },
    [setCurrentQuestion]
  );

  // Interview lifecycle
  const startInterview = useCallback(async () => {
    setPhase('interviewing');
    setRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      incrementElapsedTime();
    }, 1000);

    // Call parent handler
    if (onInterviewStart) {
      await onInterviewStart();
    }
  }, [setPhase, setRecording, incrementElapsedTime, onInterviewStart]);

  const endInterview = useCallback(async () => {
    setPhase('ending');

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Call parent handler
    if (onInterviewEnd) {
      await onInterviewEnd();
    }

    setPhase('complete');
  }, [setPhase, onInterviewEnd]);

  const value: InterviewContextValue = {
    sharedState,
    audioState,
    questionFlow,
    setPhase,
    setConnectionStatus,
    setError,
    setCurrentQuestion,
    incrementElapsedTime,
    setRecording,
    setUserAudioLevel,
    setAIAudioLevel,
    setAISpeaking,
    setMediaStream,
    toggleCamera,
    toggleMicrophone,
    onQuestionAsked,
    startInterview,
    endInterview,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterviewContext(): InterviewContextValue {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error(
      'useInterviewContext must be used within InterviewProvider'
    );
  }
  return context;
}
