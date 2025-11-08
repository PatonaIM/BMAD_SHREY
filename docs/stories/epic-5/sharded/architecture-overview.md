# 🏗️ Architecture Overview

## New Data Model: Stage-Based Timeline

Replace flat `ApplicationStatus` with hierarchical `ApplicationStage[]` model:

```typescript
// NEW: Stage-based timeline
interface Application {
  // ... existing fields

  // DEPRECATED: status: ApplicationStatus
  // NEW:
  currentStageId: string; // Points to active stage
  stages: ApplicationStage[]; // Ordered list of stages
  isDisqualified: boolean;
  disqualificationReason?: string;
  journeyCompletedAt?: Date;
}

interface ApplicationStage {
  id: string; // UUID for stable references
  type: StageType;
  order: number; // Position in timeline (0-based, allows reordering)
  status: StageStatus;

  // Metadata
  createdAt: Date;
  createdBy: { role: 'system' | 'recruiter'; id?: string };
  updatedAt: Date;

  // Stage-specific data
  data: StageData; // Polymorphic based on type

  // Visibility & actions
  visibleTo: ('candidate' | 'recruiter')[]; // Who can see this stage
  candidateActions?: CandidateAction[]; // Actions available to candidate
  recruiterActions?: RecruiterAction[]; // Actions available to recruiter
}

type StageType =
  | 'submit_application' // Always first, system-created
  | 'ai_interview' // Can be skipped
  | 'assignment' // Dynamic, max 3 instances
  | 'live_interview' // Dynamic, max 3 instances
  | 'offer' // Always before offer_accepted if not rejected
  | 'offer_accepted'; // Final stage

type StageStatus =
  | 'pending' // Stage created but candidate hasn't started
  | 'in_progress' // Candidate/recruiter actively working
  | 'awaiting_candidate' // Waiting for candidate action
  | 'awaiting_recruiter' // Waiting for recruiter action (feedback, review)
  | 'completed' // Stage finished successfully
  | 'skipped'; // Stage skipped by recruiter or system

// Polymorphic stage data
type StageData =
  | SubmitApplicationData
  | AIInterviewData
  | AssignmentData
  | LiveInterviewData
  | OfferData
  | OfferAcceptedData;

interface AssignmentData {
  title: string;
  description: string;
  documentUrl?: string; // PDF or link provided by recruiter
  documentType: 'upload' | 'link';
  timeLimit?: number; // Minutes (optional)
  submittedAt?: Date;
  submissionUrl?: string; // Azure Storage URL of candidate's upload
  feedback?: {
    rating?: number; // 1-5 stars
    comments: string; // Max 1000 chars
    providedAt: Date;
    providedBy: string; // Recruiter ID
  };
}

interface LiveInterviewData {
  title?: string; // e.g., "Technical Round 1"
  scheduledCallId?: string; // Reference to scheduledCalls collection
  slotBookedAt?: Date;
  scheduledAt?: Date;
  meetLink?: string;
  duration?: number; // Minutes
  feedback?: {
    rating?: number;
    comments: string;
    providedAt: Date;
    providedBy: string;
  };
  rescheduleRequested?: {
    requestedAt: Date;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
  };
}

interface OfferData {
  offerLetterUrl?: string; // Azure Storage URL
  uploadedAt?: Date;
  sentAt?: Date;
  decision?: 'accepted' | 'rejected';
  decisionAt?: Date;
  rejectionReason?: string; // Optional feedback from candidate
}

interface OfferAcceptedData {
  acceptedAt: Date;
  onboardingDocuments: {
    type: string; // 'ID', 'Education', 'Other'
    name: string;
    url: string; // Azure Storage URL
    uploadedAt: Date;
  }[];
  welcomeMessage?: string;
}

// Action definitions
interface CandidateAction {
  id: string;
  type:
    | 'start_interview'
    | 'upload_assignment'
    | 'book_slot'
    | 'reschedule'
    | 'accept_offer'
    | 'reject_offer'
    | 'upload_document';
  label: string; // UI button text
  enabled: boolean; // Can be disabled based on prerequisites
  disabledReason?: string; // Tooltip explaining why disabled
}

interface RecruiterAction {
  id: string;
  type:
    | 'view_profile'
    | 'view_resume'
    | 'schedule_call'
    | 'give_assignment'
    | 'give_feedback'
    | 'schedule_interview'
    | 'send_offer'
    | 'disqualify'
    | 'cancel_stage';
  label: string;
  enabled: boolean;
  requiresConfirmation?: boolean; // E.g., disqualify, cancel
}
```

## Stage Lifecycle State Machine

Each stage follows a state machine based on its type:

### Assignment Stage States

```
pending → in_progress (candidate uploads) → awaiting_recruiter (recruiter reviews)
       → completed (feedback given) OR skipped (cancelled by recruiter)
```

### Live Interview Stage States

```
pending → awaiting_candidate (recruiter adds slots) → in_progress (slot booked)
       → completed (interview done + feedback given) OR skipped (cancelled)
```

### Offer Stage States

```
pending → awaiting_candidate (offer uploaded) → completed (accepted)
       → skipped (rejected by candidate)
```

## Timeline Rendering Logic

**Candidate View**:

1. Show all completed stages (collapsed)
2. Expand current active stage with available actions
3. Hide future pending stages (for surprise-free experience) OR show as "Next Steps" teaser
4. Scroll-snap to active stage on page load

**Recruiter View**:

1. Show all stages (past, current, future)
2. Highlight stages awaiting recruiter action
3. Provide inline actions for stage management (add assignment, add interview, etc.)
4. Show candidate actions as status indicators

---
