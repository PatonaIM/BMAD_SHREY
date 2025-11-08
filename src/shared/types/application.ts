import { ApplicationStage } from './applicationStage';

export type ApplicationStatus =
  | 'submitted'
  | 'ai_interview'
  | 'under_review'
  | 'interview_scheduled'
  | 'offer'
  | 'rejected';

export interface ApplicationTimelineEvent {
  timestamp: Date;
  status: ApplicationStatus;
  note?: string;
  actorType: 'system' | 'recruiter' | 'candidate';
  actorId?: string;
}

export interface Application {
  _id: string;
  userId: string;
  jobId: string;
  candidateEmail: string; // Email of the candidate who applied
  // Job details stored for faster retrieval
  jobTitle: string;
  jobCompany: string;

  // NEW: Stage-based timeline (Epic 5)
  stages?: ApplicationStage[]; // Array of dynamic stages
  currentStageId?: string; // ID of the active stage
  isDisqualified?: boolean; // Whether application is disqualified
  disqualificationReason?: string; // Reason for disqualification
  disqualifiedAt?: Date; // When application was disqualified
  disqualifiedBy?: string; // Who disqualified (recruiterId or 'system')
  journeyStartedAt?: Date; // When application journey started (same as appliedAt)
  journeyCompletedAt?: Date; // When journey completed (offer accepted or disqualified)

  // LEGACY: Status Management (kept for backward compatibility during migration)
  /** @deprecated Use stages array instead. Will be removed after migration. */
  status: ApplicationStatus;
  /** @deprecated Use stages array instead. Will be removed after migration. */
  timeline: ApplicationTimelineEvent[];

  // Scoring
  matchScore?: number; // 0-100 overall match score
  scoreBreakdown?: {
    semanticSimilarity?: number; // 40% weight
    skillsAlignment?: number; // 35% weight
    experienceLevel?: number; // 15% weight
    otherFactors?: number; // 10% weight
  };

  // AI Interview
  interviewSessionId?: string; // Link to InterviewSession
  interviewStatus?: 'not_started' | 'in_progress' | 'completed';
  interviewScore?: number; // Boost from AI interview (5-15 points)
  interviewCompletedAt?: Date;
  scoreBeforeInterview?: number; // Original match score
  scoreAfterInterview?: number; // Score after interview boost

  // Legacy fields (deprecated - use interviewSessionId instead)
  aiInterviewId?: string;
  aiInterviewScore?: number;
  aiInterviewCompletedAt?: Date;

  // Application Data
  coverLetter?: string;
  resumeUrl?: string; // Link to uploaded resume
  resumeVersionId?: string; // Link to specific resume version from resumes collection

  // Metadata
  appliedAt: Date;
  lastViewedByRecruiterAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationListItem {
  _id: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  matchScore?: number;
  appliedAt: Date;
}
