/**
 * Interview System TypeScript Types
 * Shared types for the split-panel interview architecture
 */

// Re-export CoachingSignal from existing component
export type { CoachingSignal } from '../CoachingSignals';

export type InterviewPhase =
  | 'setup'
  | 'ready'
  | 'interviewing'
  | 'ending'
  | 'complete';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'recording'
  | 'paused';

export type QuestionCategory =
  | 'technical'
  | 'behavioral'
  | 'experience'
  | 'situational';

export interface CurrentQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  askedAt: Date;
}

export interface InterviewSharedState {
  sessionId: string;
  phase: InterviewPhase;
  currentQuestion: CurrentQuestion | null;
  elapsedSeconds: number;
  isRecording: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

export interface AudioStreamState {
  userAudioLevel: number;
  aiAudioLevel: number;
  aiSpeaking: boolean;
  mediaStream: MediaStream | null;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
}

export interface QuestionFlowState {
  totalQuestions: number;
  currentQuestionNumber: number;
  questionsAsked: CurrentQuestion[];
}

export interface InterviewContextValue {
  // Shared state
  sharedState: InterviewSharedState;
  audioState: AudioStreamState;
  questionFlow: QuestionFlowState;

  // Actions
  setPhase: (_phase: InterviewPhase) => void;
  setConnectionStatus: (_status: ConnectionStatus) => void;
  setError: (_error: string | null) => void;
  setCurrentQuestion: (_question: CurrentQuestion | null) => void;
  incrementElapsedTime: () => void;
  setRecording: (_isRecording: boolean) => void;

  // Audio actions
  setUserAudioLevel: (_level: number) => void;
  setAIAudioLevel: (_level: number) => void;
  setAISpeaking: (_speaking: boolean) => void;
  setMediaStream: (_stream: MediaStream | null) => void;
  toggleCamera: () => void;
  toggleMicrophone: () => void;

  // Question flow actions
  onQuestionAsked: (_question: CurrentQuestion) => void;

  // Interview lifecycle
  startInterview: () => Promise<void>;
  endInterview: () => Promise<void>;
}
