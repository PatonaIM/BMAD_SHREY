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

  // Status Management
  status: ApplicationStatus;
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
  aiInterviewId?: string;
  aiInterviewScore?: number; // Boost from AI interview (5-15 points)
  aiInterviewCompletedAt?: Date;

  // Application Data
  coverLetter?: string;
  resumeUrl?: string; // Link to uploaded resume

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
