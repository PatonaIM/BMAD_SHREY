/**
 * Application Stage Types for Epic 5: Dynamic Timeline System
 *
 * This file defines the core types for the stage-based application workflow.
 * Each application now has multiple stages (assignments, interviews, offers)
 * instead of a single linear status.
 *
 * @module applicationStage
 * @see {@link Application} in application.ts for the updated application model
 */

/**
 * Core stage type representing a single step in the application journey
 */
export interface ApplicationStage {
  /** Unique identifier (UUID) */
  id: string;

  /** Reference to the application this stage belongs to */
  applicationId: string;

  /** Type of stage */
  type: StageType;

  /** Order in the timeline (0-indexed, gaps allowed for insertions) */
  order: number;

  /** Current status of the stage */
  status: StageStatus;

  /** Title displayed in UI (optional, defaults to type-based title) */
  title?: string;

  /** Whether candidate can see this stage */
  visibleToCandidate: boolean;

  /** Polymorphic data specific to stage type */
  data: StageData;

  /** Timestamp when stage was created */
  createdAt: Date;

  /** Timestamp when stage was last updated */
  updatedAt: Date;

  /** Timestamp when stage was completed (if applicable) */
  completedAt?: Date;

  /** User ID who created this stage */
  createdBy: string;

  /** User ID who last updated this stage */
  updatedBy: string;

  /** Actions available to candidate in this stage */
  candidateActions?: CandidateAction[];

  /** Actions available to recruiter in this stage */
  recruiterActions?: RecruiterAction[];
}

/**
 * Stage types representing different steps in application journey
 */
export type StageType =
  | 'submit_application' // Initial application submission (system-created)
  | 'ai_interview' // AI-powered video interview
  | 'under_review' // Recruiter reviewing application
  | 'assignment' // Technical/take-home assignment (up to 3)
  | 'live_interview' // Scheduled live interview (up to 3)
  | 'offer' // Job offer sent to candidate
  | 'offer_accepted' // Candidate accepted offer, onboarding starts
  | 'disqualified'; // Application disqualified (terminal state)

/**
 * Stage status representing lifecycle within a stage
 */
export type StageStatus =
  | 'pending' // Stage created but not started
  | 'awaiting_candidate' // Waiting for candidate action
  | 'in_progress' // Actively being worked on
  | 'awaiting_recruiter' // Waiting for recruiter action
  | 'completed' // Stage finished successfully
  | 'skipped'; // Stage skipped/cancelled

/**
 * Polymorphic stage data (discriminated union)
 * Uses type field for TypeScript discrimination
 */
export type StageData =
  | SubmitApplicationData
  | AiInterviewData
  | UnderReviewData
  | AssignmentData
  | LiveInterviewData
  | OfferData
  | OfferAcceptedData
  | DisqualifiedData;

/**
 * Submit Application Stage Data
 */
export interface SubmitApplicationData {
  type: 'submit_application';
  submittedAt: Date;
  resumeUrl?: string;
  coverLetter?: string;
}

/**
 * AI Interview Stage Data
 */
export interface AiInterviewData {
  type: 'ai_interview';
  interviewSessionId?: string;
  interviewScore?: number;
  interviewCompletedAt?: Date;
}

/**
 * Under Review Stage Data
 */
export interface UnderReviewData {
  type: 'under_review';
  reviewStartedAt?: Date;
  reviewedBy?: string; // recruiterId
}

/**
 * Assignment Stage Data (up to 3 per application)
 */
export interface AssignmentData {
  type: 'assignment';

  /** Assignment title (e.g., "Backend Coding Challenge") */
  title: string;

  /** Assignment description/instructions */
  description: string;

  /** Assignment document URL (Azure Storage) or external link */
  documentUrl?: string;

  /** Whether document is external link or uploaded file */
  isExternalLink: boolean;

  /** Time limit in hours (optional) */
  timeLimitHours?: number;

  /** When assignment was sent to candidate */
  sentAt: Date;

  /** When candidate started working on it */
  startedAt?: Date;

  /** Candidate's uploaded answer URL (Azure Storage) */
  answerUrl?: string;

  /** When candidate submitted answer */
  submittedAt?: Date;

  /** Recruiter feedback */
  feedback?: {
    rating: number; // 1-5 stars
    comments: string;
    providedAt: Date;
    providedBy: string; // recruiterId
  };
}

/**
 * Live Interview Stage Data (up to 3 per application)
 */
export interface LiveInterviewData {
  type: 'live_interview';

  /** Interview title (e.g., "Technical Round 1") */
  title?: string;

  /** Description/agenda */
  description?: string;

  /** Link to scheduledCalls collection (Epic 4 integration) */
  scheduledCallId?: string;

  /** Google Meet link for interview */
  meetLink?: string;

  /** Scheduled interview time */
  scheduledTime?: Date;

  /** Available time slots for candidate to choose from */
  availableSlots?: Date[];

  /** When candidate booked the slot */
  bookedAt?: Date;

  /** Interview duration in minutes */
  durationMinutes: number;

  /** Interview completed timestamp */
  completedAt?: Date;

  /** Recruiter feedback */
  feedback?: {
    rating: number; // 1-5 stars
    comments: string;
    providedAt: Date;
    providedBy: string; // recruiterId
  };

  /** Reschedule requests */
  rescheduleRequests?: {
    requestedAt: Date;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
  }[];
}

/**
 * Offer Stage Data
 */
export interface OfferData {
  type: 'offer';

  /** Offer letter document URL (Azure Storage) */
  offerLetterUrl?: string;

  /** When offer was sent */
  sentAt: Date;

  /** Offer expiration date (optional) */
  expiresAt?: Date;

  /** When candidate viewed the offer */
  viewedAt?: Date;

  /** Candidate's response (accept/reject) */
  response?: 'accepted' | 'rejected';

  /** When candidate responded */
  respondedAt?: Date;

  /** Rejection reason (if rejected) */
  rejectionReason?: string;
}

/**
 * Offer Accepted Stage Data (Onboarding)
 */
export interface OfferAcceptedData {
  type: 'offer_accepted';

  /** When offer was accepted */
  acceptedAt: Date;

  /** Expected start date */
  startDate?: Date;

  /** Welcome message from recruiter */
  welcomeMessage?: string;

  /** Onboarding documents uploaded by candidate */
  onboardingDocuments?: OnboardingDocument[];

  /** Whether onboarding is complete */
  onboardingComplete: boolean;

  /** When onboarding was marked complete */
  onboardingCompletedAt?: Date;
}

/**
 * Onboarding Document
 */
export interface OnboardingDocument {
  type:
    | 'id_proof'
    | 'education_certificate'
    | 'background_check'
    | 'tax_forms'
    | 'other';
  fileName: string;
  fileUrl: string; // Azure Storage URL
  uploadedAt: Date;
  required: boolean;
}

/**
 * Disqualified Stage Data (Terminal State)
 */
export interface DisqualifiedData {
  type: 'disqualified';

  /** When disqualified */
  disqualifiedAt: Date;

  /** Who disqualified (recruiterId or 'system') */
  disqualifiedBy: string;

  /** Reason for disqualification */
  reason: string;

  /** At which stage was candidate disqualified */
  atStageType: StageType;
}

/**
 * Candidate Action Definition
 * Represents an action that a candidate can take in a stage
 */
export interface CandidateAction {
  /** Unique action ID */
  id: string;

  /** Action type */
  type:
    | 'upload_document'
    | 'book_slot'
    | 'reschedule'
    | 'accept_offer'
    | 'reject_offer'
    | 'start_interview';

  /** Action label (displayed in button) */
  label: string;

  /** Action description/tooltip */
  description?: string;

  /** Whether action is currently enabled */
  enabled: boolean;

  /** Reason why disabled (for tooltip) */
  disabledReason?: string;

  /** Whether action is primary (styling) */
  isPrimary: boolean;

  /** Icon name (from icon library) */
  icon?: string;
}

/**
 * Recruiter Action Definition
 * Represents an action that a recruiter can take in a stage
 */
export interface RecruiterAction {
  /** Unique action ID */
  id: string;

  /** Action type */
  type:
    | 'give_assignment'
    | 'schedule_interview'
    | 'provide_feedback'
    | 'send_offer'
    | 'revoke_offer'
    | 'disqualify'
    | 'cancel_stage';

  /** Action label */
  label: string;

  /** Action description */
  description?: string;

  /** Whether action is enabled */
  enabled: boolean;

  /** Reason why disabled */
  disabledReason?: string;

  /** Whether action requires confirmation dialog */
  requiresConfirmation: boolean;

  /** Confirmation message */
  confirmationMessage?: string;

  /** Whether action is destructive (styling) */
  isDestructive: boolean;

  /** Icon name */
  icon?: string;
}

/**
 * Type guards for StageData discrimination
 */
export function isSubmitApplicationData(
  data: StageData
): data is SubmitApplicationData {
  return data.type === 'submit_application';
}

export function isAiInterviewData(data: StageData): data is AiInterviewData {
  return data.type === 'ai_interview';
}

export function isUnderReviewData(data: StageData): data is UnderReviewData {
  return data.type === 'under_review';
}

export function isAssignmentData(data: StageData): data is AssignmentData {
  return data.type === 'assignment';
}

export function isLiveInterviewData(
  data: StageData
): data is LiveInterviewData {
  return data.type === 'live_interview';
}

export function isOfferData(data: StageData): data is OfferData {
  return data.type === 'offer';
}

export function isOfferAcceptedData(
  data: StageData
): data is OfferAcceptedData {
  return data.type === 'offer_accepted';
}

export function isDisqualifiedData(data: StageData): data is DisqualifiedData {
  return data.type === 'disqualified';
}
