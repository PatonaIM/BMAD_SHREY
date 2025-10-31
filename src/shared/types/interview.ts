export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'experience' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number; // seconds
  followUpTopics?: string[];
  scoringCriteria?: string[];
  // Populated during interview
  askedAt?: Date;
  answeredAt?: Date;
  transcriptSegment?: string; // Portion of transcript for this Q&A
}

export type InterviewStatus =
  | 'preparing' // Questions generated, not started
  | 'active' // Interview in progress
  | 'completed' // Successfully completed
  | 'abandoned' // User left before completion
  | 'error'; // Technical error occurred

export interface InterviewSessionMetadata {
  videoFormat: string; // 'video/webm', 'video/mp4'
  audioFormat: string; // 'audio/webm', 'audio/pcm16'
  videoResolution: string; // '1280x720', '1920x1080'
  fileSize?: number; // bytes - populated after upload
  transcriptAvailable: boolean;
  hasWebcam: boolean;
  hasScreenShare: boolean; // Future: screen recording capability
  browser?: string; // User agent info
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface InterviewSession {
  _id: string;
  userId: string;
  applicationId: string;
  jobId: string;
  sessionId: string; // UUID for Azure storage path
  questions: InterviewQuestion[];

  // Recording URLs
  videoRecordingUrl?: string; // Azure Blob URL - populated after upload
  audioRecordingUrl?: string; // Separate audio if needed
  recordingPath: string; // Azure storage path: {userId}/{applicationId}/{sessionId}/recording.webm
  transcriptUrl?: string; // Future: Full transcript JSON

  // Timing
  duration?: number; // seconds - actual duration after completion
  estimatedDuration: number; // seconds - target duration based on questions
  startedAt?: Date; // When interview actually began
  endedAt?: Date; // When interview completed/abandoned

  // Status
  status: InterviewStatus;
  errorMessage?: string; // If status === 'error'

  // Metadata
  metadata: InterviewSessionMetadata;

  // Analysis (populated post-interview)
  scores?: {
    technical?: number; // 0-100
    communication?: number; // 0-100
    experience?: number; // 0-100
    overall?: number; // 0-100
    confidence?: number; // 0-100 - AI confidence in scoring
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInterviewSessionParams {
  userId: string;
  applicationId: string;
  jobId: string;
  questions: InterviewQuestion[];
  estimatedDuration: number;
  metadata?: Partial<InterviewSessionMetadata>;
}

export interface UpdateInterviewSessionParams {
  status?: InterviewStatus;
  videoRecordingUrl?: string;
  audioRecordingUrl?: string;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
  errorMessage?: string;
  metadata?: Partial<InterviewSessionMetadata>;
  scores?: InterviewSession['scores'];
}

export interface InterviewSessionListItem {
  _id: string;
  jobTitle: string;
  jobCompany: string;
  status: InterviewStatus;
  duration?: number;
  startedAt?: Date;
  createdAt: Date;
  questionCount: number;
  hasRecording: boolean;
}
