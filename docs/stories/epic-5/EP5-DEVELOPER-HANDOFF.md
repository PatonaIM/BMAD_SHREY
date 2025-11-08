# Epic 5: Dynamic Timeline System - Developer Handoff

**Epic ID**: EP5  
**Handoff Date**: November 8, 2025  
**Target Start Date**: Week of November 11, 2025  
**Sprint Duration**: 8 weeks (4 sprints x 2 weeks)

---

## 📋 Quick Start Checklist

Before you start development, ensure you have:

- [ ] Read the [Epic 5 PRD](/docs/stories/epic-5/epic-5-dynamic-timeline-system.md)
- [ ] Read the [Frontend Architecture](/docs/frontend-architecture-epic5.md)
- [ ] Read the [Sprint Plan](/docs/stories/epic-5/EP5-SPRINT-PLAN.md)
- [ ] Access to staging environment
- [ ] MongoDB access for migration testing
- [ ] Azure Storage credentials configured
- [ ] Google Calendar API credentials (for Story 5.5)
- [ ] Local development environment set up
- [ ] All dependencies installed (`npm install`)
- [ ] Redis running locally (for session management)

---

## 🎯 Epic Overview

### What We're Building

Transform TeamMatch's application workflow from a linear status-based system into a **dynamic, multi-stage timeline** that supports:

1. **Multiple Stages Per Application**: Up to 3 assignments, 3 live interviews, offers, onboarding
2. **Role-Based Views**: Different interfaces for candidates vs. recruiters
3. **Dynamic Stage Management**: Stages can be added, removed, reordered
4. **State Machine**: Each stage has sub-states (pending → in_progress → completed)
5. **Integrated Actions**: Upload documents, schedule interviews, provide feedback—all within timeline

### Current vs. Future State

**Current State**:

```typescript
interface Application {
  status:
    | 'submitted'
    | 'ai_interview'
    | 'under_review'
    | 'interview_scheduled'
    | 'offer'
    | 'rejected';
  timeline: ApplicationTimelineEvent[]; // Append-only audit log
}
```

**Future State**:

```typescript
interface Application {
  stages: ApplicationStage[]; // Dynamic, mutable stage list
  currentStageId: string;
  isDisqualified: boolean;
  // ... other fields
}

interface ApplicationStage {
  id: string;
  type: StageType;
  order: number;
  status: StageStatus;
  data: StageData; // Polymorphic: AssignmentData | LiveInterviewData | OfferData
  candidateActions: CandidateAction[];
  recruiterActions: RecruiterAction[];
}
```

---

## 🏗️ Technical Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
├───────────────────────────────┬─────────────────────────────┤
│   Candidate Timeline UI       │   Recruiter Timeline UI      │
│   - ApplicationTimeline.tsx   │   - ApplicationTimeline.tsx  │
│   - AssignmentStage.tsx       │   - GiveAssignmentModal.tsx  │
│   - LiveInterviewStage.tsx    │   - ScheduleInterviewModal   │
│   - OfferStage.tsx            │   - SendOfferModal.tsx       │
└───────────────────────────────┴─────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer (React)                      │
│   useStages(), useStageActions(), useAssignment()           │
│   useLiveInterview(), useOffer(), useOnboarding()           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   tRPC API Layer (Next.js)                   │
├───────────────────────────────┬─────────────────────────────┤
│   candidateRouter             │   recruiterRouter            │
│   - uploadAssignmentAnswer    │   - giveAssignment           │
│   - bookInterviewSlot         │   - scheduleInterview        │
│   - respondToOffer            │   - sendOffer                │
└───────────────────────────────┴─────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│   StageService: CRUD + business logic + validation           │
│   TimelineService: Audit events (existing)                   │
│   GoogleCalendarService: Calendar integration (Epic 4)       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│   ApplicationStageRepository: MongoDB queries                │
│   ScheduledCallRepository: Calendar data (Epic 4)            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (MongoDB)                       │
│   applications collection: { stages: ApplicationStage[] }   │
│   scheduledCalls collection: Live interview data             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                External Services (Azure, Google)             │
│   Azure Blob Storage: Document uploads (assignments, offers)│
│   Google Calendar API: Interview scheduling (Epic 4)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

### New Files to Create

```
src/
├── shared/
│   └── types/
│       ├── applicationStage.ts (NEW - Core type definitions)
│       └── application.ts (MODIFY - Add stages field)
│
├── services/
│   ├── stageService.ts (NEW - 400+ lines, business logic)
│   └── trpc/
│       ├── candidateRouter.ts (MODIFY - Add stage procedures)
│       └── recruiterRouter.ts (MODIFY - Add stage procedures)
│
├── data-access/
│   └── repositories/
│       └── applicationStageRepo.ts (NEW - 300+ lines, DB queries)
│
├── utils/
│   ├── stageHelpers.ts (NEW - Utility functions)
│   └── stageValidation.ts (NEW - Validation rules)
│
├── components/
│   ├── timeline/ (NEW - Shared timeline components)
│   │   ├── ApplicationTimeline.tsx
│   │   ├── TimelineStage.tsx
│   │   ├── StageActions.tsx
│   │   ├── StageProgress.tsx
│   │   └── StageIcon.tsx
│   │
│   ├── candidate/
│   │   ├── stages/ (NEW)
│   │   │   ├── AssignmentStage.tsx
│   │   │   ├── LiveInterviewStage.tsx
│   │   │   ├── OfferStage.tsx
│   │   │   ├── OfferAcceptedStage.tsx
│   │   │   └── DisqualifiedStage.tsx
│   │   └── actions/ (NEW)
│   │       ├── UploadAssignmentModal.tsx
│   │       ├── InterviewSlotPicker.tsx
│   │       ├── OfferDecisionModal.tsx
│   │       └── OnboardingDocumentUpload.tsx
│   │
│   └── recruiter/
│       ├── actions/ (NEW)
│       │   ├── GiveAssignmentModal.tsx
│       │   ├── AssignmentFeedbackModal.tsx
│       │   ├── ScheduleInterviewModal.tsx
│       │   ├── SendOfferModal.tsx
│       │   ├── RevokeOfferModal.tsx
│       │   └── DisqualifyModal.tsx
│       └── lists/ (NEW)
│           ├── AssignmentListView.tsx
│           └── OfferListView.tsx
│
├── hooks/
│   ├── useStages.ts (NEW - Fetch stages)
│   ├── useStageActions.ts (NEW - Action handlers)
│   ├── useAssignment.ts (NEW - Assignment operations)
│   ├── useLiveInterview.ts (NEW - Interview operations)
│   ├── useOffer.ts (NEW - Offer operations)
│   └── useOnboarding.ts (NEW - Onboarding operations)
│
└── scripts/
    └── migrations/
        └── migrate-to-stages.ts (NEW - Data migration script)

__tests__/
├── services/
│   └── stageService.test.ts (NEW - Service unit tests)
├── repositories/
│   └── applicationStageRepo.test.ts (NEW - Repository tests)
├── utils/
│   ├── stageHelpers.test.ts (NEW)
│   └── stageValidation.test.ts (NEW)
└── e2e/
    ├── assignment-workflow.spec.ts (NEW)
    ├── interview-workflow.spec.ts (NEW)
    └── offer-workflow.spec.ts (NEW)
```

---

## 🔑 Core Type Definitions (Story 5.1)

### ApplicationStage.ts (Complete)

```typescript
// src/shared/types/applicationStage.ts

/**
 * Core stage type representing a single step in the application journey
 */
export interface ApplicationStage {
  /** Unique identifier (UUID) */
  id: string;

  /** Type of stage */
  type: StageType;

  /** Order in the timeline (0-indexed, gaps allowed) */
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
```

### Updated Application Interface

```typescript
// src/shared/types/application.ts (MODIFIED)

import { ApplicationStage, StageType } from './applicationStage';

export interface Application {
  _id: string;
  userId: string;
  jobId: string;
  candidateEmail: string;

  // Job details
  jobTitle: string;
  jobCompany: string;

  // NEW: Stage-based timeline
  stages: ApplicationStage[];
  currentStageId: string; // ID of the active stage

  // NEW: Disqualification tracking
  isDisqualified: boolean;
  disqualificationReason?: string;
  disqualifiedAt?: Date;
  disqualifiedBy?: string; // recruiterId or 'system'

  // NEW: Journey metadata
  journeyStartedAt: Date; // Same as appliedAt
  journeyCompletedAt?: Date; // When offer accepted or disqualified

  // LEGACY: Keep for backward compatibility during migration
  status?: ApplicationStatus; // Will be removed after migration
  timeline?: ApplicationTimelineEvent[]; // Will be removed after migration

  // Scoring (unchanged)
  matchScore?: number;
  scoreBreakdown?: {
    semanticSimilarity?: number;
    skillsAlignment?: number;
    experienceLevel?: number;
    otherFactors?: number;
  };

  // AI Interview (now tracked in stages)
  interviewSessionId?: string;
  interviewStatus?: 'not_started' | 'in_progress' | 'completed';
  interviewScore?: number;
  interviewCompletedAt?: Date;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;

  // Application Data
  coverLetter?: string;
  resumeUrl?: string;
  resumeVersionId?: string;

  // Metadata
  appliedAt: Date;
  lastViewedByRecruiterAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🛠️ Implementation Guidelines

### Story 5.1: Data Model & Migration

#### Migration Strategy

**Step 1: Backup Database**

```bash
# Backup production database
mongodump --uri="mongodb://..." --out=./backup-$(date +%Y%m%d)

# Verify backup
mongorestore --uri="mongodb://localhost:27017/test-restore" --dir=./backup-20251108
```

**Step 2: Migration Script**

```typescript
// scripts/migrations/migrate-to-stages.ts

import { connectToDatabase } from '@/lib/mongodb';
import { ApplicationStatus } from '@/shared/types/application';
import {
  ApplicationStage,
  StageType,
  StageStatus,
} from '@/shared/types/applicationStage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Migration script: Convert old status-based model to stage-based model
 *
 * Usage:
 *   npx ts-node scripts/migrations/migrate-to-stages.ts --dry-run
 *   npx ts-node scripts/migrations/migrate-to-stages.ts --execute
 */

async function migrateApplication(application: any): Promise<any> {
  const stages: ApplicationStage[] = [];
  let order = 0;

  // Always create submit_application stage
  stages.push(
    createStage({
      type: 'submit_application',
      order: order++,
      status: 'completed',
      data: {
        type: 'submit_application',
        submittedAt: application.appliedAt,
        resumeUrl: application.resumeUrl,
        coverLetter: application.coverLetter,
      },
      completedAt: application.appliedAt,
    })
  );

  // Map old status to stages
  const statusMap: Record<ApplicationStatus, StageType[]> = {
    submitted: ['submit_application'],
    ai_interview: ['submit_application', 'ai_interview'],
    under_review: ['submit_application', 'ai_interview', 'under_review'],
    interview_scheduled: [
      'submit_application',
      'ai_interview',
      'under_review',
      'live_interview',
    ],
    offer: ['submit_application', 'ai_interview', 'under_review', 'offer'],
    rejected: ['submit_application'], // Will be marked as disqualified
  };

  const currentStatus = application.status as ApplicationStatus;
  const stageTypes = statusMap[currentStatus] || ['submit_application'];

  // Create stages based on current status
  for (let i = 1; i < stageTypes.length; i++) {
    const type = stageTypes[i];
    const isCurrentStage = i === stageTypes.length - 1;

    stages.push(
      createStage({
        type,
        order: order++,
        status: isCurrentStage
          ? mapStatusToStageStatus(currentStatus)
          : 'completed',
        data: createStageData(type, application),
        completedAt: isCurrentStage ? undefined : application.updatedAt,
      })
    );
  }

  // Determine current stage
  const currentStage = stages[stages.length - 1];

  // Handle rejection (disqualification)
  const isDisqualified = currentStatus === 'rejected';

  return {
    ...application,
    stages,
    currentStageId: currentStage.id,
    isDisqualified,
    disqualificationReason: isDisqualified
      ? 'Migrated from old system'
      : undefined,
    disqualifiedAt: isDisqualified ? application.updatedAt : undefined,
    journeyStartedAt: application.appliedAt,
    journeyCompletedAt: isDisqualified ? application.updatedAt : undefined,
  };
}

function createStage(
  partial: Partial<ApplicationStage> & { type: StageType }
): ApplicationStage {
  return {
    id: uuidv4(),
    type: partial.type,
    order: partial.order ?? 0,
    status: partial.status ?? 'pending',
    visibleToCandidate: true,
    data: partial.data as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: partial.completedAt,
    candidateActions: [],
    recruiterActions: [],
    ...partial,
  };
}

function createStageData(type: StageType, application: any): any {
  switch (type) {
    case 'ai_interview':
      return {
        type: 'ai_interview',
        interviewSessionId: application.interviewSessionId,
        interviewScore: application.interviewScore,
        interviewCompletedAt: application.interviewCompletedAt,
      };
    case 'under_review':
      return {
        type: 'under_review',
        reviewStartedAt: application.updatedAt,
      };
    case 'live_interview':
      return {
        type: 'live_interview',
        durationMinutes: 60,
      };
    case 'offer':
      return {
        type: 'offer',
        sentAt: application.updatedAt,
      };
    default:
      return { type };
  }
}

function mapStatusToStageStatus(status: ApplicationStatus): StageStatus {
  switch (status) {
    case 'submitted':
      return 'completed';
    case 'ai_interview':
      return 'in_progress';
    case 'under_review':
      return 'in_progress';
    case 'interview_scheduled':
      return 'awaiting_candidate';
    case 'offer':
      return 'awaiting_candidate';
    case 'rejected':
      return 'completed';
    default:
      return 'pending';
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`Starting migration (${isDryRun ? 'DRY RUN' : 'EXECUTE'})...`);

  const db = await connectToDatabase();
  const applications = await db.collection('applications').find({}).toArray();

  console.log(`Found ${applications.length} applications to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const app of applications) {
    try {
      const migratedApp = await migrateApplication(app);

      if (!isDryRun) {
        await db
          .collection('applications')
          .updateOne({ _id: app._id }, { $set: migratedApp });
      }

      successCount++;
      if (successCount % 100 === 0) {
        console.log(
          `Migrated ${successCount}/${applications.length} applications...`
        );
      }
    } catch (error) {
      console.error(`Error migrating application ${app._id}:`, error);
      errorCount++;
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (isDryRun) {
    console.log('\nThis was a DRY RUN. No changes were made.');
    console.log('Run with --execute to apply changes.');
  }
}

main().catch(console.error);
```

**Step 3: Create MongoDB Indexes**

```typescript
// After migration, create indexes for performance
db.applications.createIndex({ 'stages.type': 1 });
db.applications.createIndex({ 'stages.status': 1 });
db.applications.createIndex({ 'stages.order': 1 });
db.applications.createIndex({ currentStageId: 1 });
db.applications.createIndex({ isDisqualified: 1 });
db.applications.createIndex({ 'stages.data.submittedAt': -1 }); // For sorting
```

---

### Story 5.2: Stage Service Implementation

#### StageService Class (Core Methods)

```typescript
// src/services/stageService.ts

import {
  ApplicationStage,
  StageType,
  StageStatus,
  StageData,
  CandidateAction,
  RecruiterAction,
} from '@/shared/types/applicationStage';
import { ApplicationStageRepository } from '@/data-access/repositories/applicationStageRepo';
import { TimelineService } from './timelineService';
import { v4 as uuidv4 } from 'uuid';

export class StageService {
  constructor(
    private stageRepo: ApplicationStageRepository,
    private timelineService: TimelineService
  ) {}

  /**
   * Create a new stage for an application
   */
  async createStage(
    applicationId: string,
    input: {
      type: StageType;
      title?: string;
      data: StageData;
      visibleToCandidate?: boolean;
      insertAfterStageId?: string; // Insert after specific stage
    }
  ): Promise<ApplicationStage> {
    // Validate business rules
    await this.validateStageCreation(applicationId, input.type);

    // Get existing stages to determine order
    const existingStages = await this.stageRepo.getStages(applicationId);
    const order = this.calculateNewStageOrder(
      existingStages,
      input.insertAfterStageId
    );

    // Create stage
    const stage: ApplicationStage = {
      id: uuidv4(),
      type: input.type,
      order,
      status: 'pending',
      title: input.title,
      visibleToCandidate: input.visibleToCandidate ?? true,
      data: input.data,
      createdAt: new Date(),
      updatedAt: new Date(),
      candidateActions: this.generateCandidateActions(input.type, 'pending'),
      recruiterActions: this.generateRecruiterActions(input.type, 'pending'),
    };

    // Save to database
    await this.stageRepo.addStage(applicationId, stage);

    // Add timeline event
    await this.timelineService.addEvent(applicationId, {
      type: 'stage_created',
      stageType: input.type,
      timestamp: new Date(),
    });

    return stage;
  }

  /**
   * Update stage status with validation
   */
  async updateStageStatus(
    applicationId: string,
    stageId: string,
    newStatus: StageStatus,
    updatedBy: string
  ): Promise<void> {
    const stage = await this.stageRepo.getStageById(applicationId, stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    // Validate transition
    const isValidTransition = await this.validateStageTransition(
      stage.status,
      newStatus,
      stage.type
    );

    if (!isValidTransition) {
      throw new InvalidTransitionError(
        `Cannot transition from ${stage.status} to ${newStatus} for stage type ${stage.type}`
      );
    }

    // Update status
    const updates: Partial<ApplicationStage> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'completed') {
      updates.completedAt = new Date();
    }

    // Regenerate actions based on new status
    updates.candidateActions = this.generateCandidateActions(
      stage.type,
      newStatus
    );
    updates.recruiterActions = this.generateRecruiterActions(
      stage.type,
      newStatus
    );

    await this.stageRepo.updateStage(applicationId, stageId, updates);

    // Add timeline event
    await this.timelineService.addEvent(applicationId, {
      type: 'stage_status_changed',
      stageId,
      stageType: stage.type,
      oldStatus: stage.status,
      newStatus,
      timestamp: new Date(),
      actorId: updatedBy,
    });

    // Update current stage if needed
    if (newStatus === 'completed') {
      await this.advanceToNextStage(applicationId, stageId);
    }
  }

  /**
   * Add or update data for a stage
   */
  async addStageData(
    applicationId: string,
    stageId: string,
    dataUpdate: Partial<StageData>
  ): Promise<void> {
    const stage = await this.stageRepo.getStageById(applicationId, stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    const updatedData = {
      ...stage.data,
      ...dataUpdate,
    };

    await this.stageRepo.updateStage(applicationId, stageId, {
      data: updatedData,
      updatedAt: new Date(),
    });
  }

  /**
   * Get active stage for application
   */
  async getActiveStage(
    applicationId: string
  ): Promise<ApplicationStage | null> {
    const application = await this.stageRepo.getApplication(applicationId);
    if (!application || !application.currentStageId) {
      return null;
    }

    return this.stageRepo.getStageById(
      applicationId,
      application.currentStageId
    );
  }

  /**
   * Get all stages by type (e.g., all assignments)
   */
  async getStagesByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]> {
    const stages = await this.stageRepo.getStages(applicationId);
    return stages.filter(s => s.type === type);
  }

  /**
   * Get visible stages for role
   */
  async getVisibleStages(
    applicationId: string,
    role: 'candidate' | 'recruiter'
  ): Promise<ApplicationStage[]> {
    const stages = await this.stageRepo.getStages(applicationId);

    if (role === 'recruiter') {
      return stages; // Recruiter sees all stages
    }

    // Candidate sees only visible stages
    return stages.filter(s => s.visibleToCandidate);
  }

  /**
   * Validate if stage creation is allowed
   */
  private async validateStageCreation(
    applicationId: string,
    type: StageType
  ): Promise<void> {
    const existingStages = await this.stageRepo.getStages(applicationId);
    const stagesOfType = existingStages.filter(s => s.type === type);

    // Business rules
    if (type === 'assignment' && stagesOfType.length >= 3) {
      throw new MaxStagesError('Maximum 3 assignments allowed per application');
    }

    if (type === 'live_interview' && stagesOfType.length >= 3) {
      throw new MaxStagesError(
        'Maximum 3 live interviews allowed per application'
      );
    }

    if (type === 'offer' && stagesOfType.length >= 1) {
      throw new MaxStagesError('Only 1 offer allowed per application');
    }

    // Check if application is disqualified
    const application = await this.stageRepo.getApplication(applicationId);
    if (application.isDisqualified) {
      throw new Error('Cannot create stages for disqualified application');
    }
  }

  /**
   * Validate stage transition
   */
  private async validateStageTransition(
    currentStatus: StageStatus,
    newStatus: StageStatus,
    stageType: StageType
  ): Promise<boolean> {
    // Define valid transitions per stage type
    const validTransitions: Record<
      StageType,
      Record<StageStatus, StageStatus[]>
    > = {
      assignment: {
        pending: ['in_progress', 'skipped'],
        in_progress: ['awaiting_recruiter', 'skipped'],
        awaiting_recruiter: ['completed', 'in_progress'],
        completed: [],
        skipped: [],
        awaiting_candidate: [],
      },
      live_interview: {
        pending: ['awaiting_candidate', 'skipped'],
        awaiting_candidate: ['in_progress', 'skipped'],
        in_progress: ['completed', 'skipped'],
        completed: [],
        skipped: [],
        awaiting_recruiter: [],
      },
      offer: {
        pending: ['awaiting_candidate', 'skipped'],
        awaiting_candidate: ['completed', 'skipped'],
        completed: [],
        skipped: [],
        in_progress: [],
        awaiting_recruiter: [],
      },
      // ... other stage types
    };

    const allowedTransitions =
      validTransitions[stageType]?.[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Generate candidate actions based on stage type and status
   */
  private generateCandidateActions(
    type: StageType,
    status: StageStatus
  ): CandidateAction[] {
    const actions: CandidateAction[] = [];

    if (type === 'assignment' && status === 'in_progress') {
      actions.push({
        id: 'upload_assignment',
        type: 'upload_document',
        label: 'Upload Answer',
        description: 'Upload your assignment solution',
        enabled: true,
        isPrimary: true,
        icon: 'upload',
      });
    }

    if (type === 'live_interview' && status === 'awaiting_candidate') {
      actions.push({
        id: 'book_slot',
        type: 'book_slot',
        label: 'Select Time Slot',
        description: 'Choose an interview time that works for you',
        enabled: true,
        isPrimary: true,
        icon: 'calendar',
      });
    }

    if (type === 'offer' && status === 'awaiting_candidate') {
      actions.push(
        {
          id: 'accept_offer',
          type: 'accept_offer',
          label: 'Accept Offer',
          description: 'Accept this job offer',
          enabled: true,
          isPrimary: true,
          icon: 'check',
        },
        {
          id: 'reject_offer',
          type: 'reject_offer',
          label: 'Decline Offer',
          description: 'Decline this job offer',
          enabled: true,
          isPrimary: false,
          icon: 'x',
        }
      );
    }

    return actions;
  }

  /**
   * Generate recruiter actions based on stage type and status
   */
  private generateRecruiterActions(
    type: StageType,
    status: StageStatus
  ): RecruiterAction[] {
    const actions: RecruiterAction[] = [];

    if (type === 'assignment' && status === 'awaiting_recruiter') {
      actions.push({
        id: 'provide_feedback',
        type: 'provide_feedback',
        label: 'Provide Feedback',
        description: 'Review assignment and provide feedback',
        enabled: true,
        requiresConfirmation: false,
        isDestructive: false,
        icon: 'message',
      });
    }

    if (type === 'assignment' && status === 'pending') {
      actions.push({
        id: 'cancel_assignment',
        type: 'cancel_stage',
        label: 'Cancel Assignment',
        description: 'Cancel this assignment before candidate starts',
        enabled: true,
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to cancel this assignment?',
        isDestructive: true,
        icon: 'trash',
      });
    }

    // Disqualify action available at most stages
    if (
      !['disqualified', 'offer_accepted'].includes(type) &&
      status !== 'completed'
    ) {
      actions.push({
        id: 'disqualify',
        type: 'disqualify',
        label: 'Disqualify Candidate',
        description: 'Remove candidate from consideration',
        enabled: true,
        requiresConfirmation: true,
        confirmationMessage:
          'Are you sure you want to disqualify this candidate? This action cannot be undone.',
        isDestructive: true,
        icon: 'x-circle',
      });
    }

    return actions;
  }

  /**
   * Calculate order for new stage
   */
  private calculateNewStageOrder(
    existingStages: ApplicationStage[],
    insertAfterStageId?: string
  ): number {
    if (!insertAfterStageId) {
      // Append to end
      return existingStages.length > 0
        ? Math.max(...existingStages.map(s => s.order)) + 1
        : 0;
    }

    const afterStage = existingStages.find(s => s.id === insertAfterStageId);
    if (!afterStage) {
      throw new Error(`Stage ${insertAfterStageId} not found`);
    }

    // Insert after specified stage (leave gap for future insertions)
    return afterStage.order + 0.5;
  }

  /**
   * Advance to next stage after completion
   */
  private async advanceToNextStage(
    applicationId: string,
    completedStageId: string
  ): Promise<void> {
    const stages = await this.stageRepo.getStages(applicationId);
    const completedStage = stages.find(s => s.id === completedStageId);

    if (!completedStage) return;

    // Find next pending stage
    const nextStage = stages
      .filter(s => s.order > completedStage.order && s.status === 'pending')
      .sort((a, b) => a.order - b.order)[0];

    if (nextStage) {
      await this.stageRepo.updateApplication(applicationId, {
        currentStageId: nextStage.id,
        updatedAt: new Date(),
      });
    }
  }
}

// Custom errors
export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

export class MaxStagesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaxStagesError';
  }
}
```

---

### Story 5.3: Timeline UI Implementation

#### ApplicationTimeline Component

```tsx
// src/components/timeline/ApplicationTimeline.tsx

import React, { useEffect, useRef } from 'react';
import { ApplicationStage } from '@/shared/types/applicationStage';
import { useStages } from '@/hooks/useStages';
import { TimelineStage } from './TimelineStage';
import { Skeleton } from '@/components/ui/skeleton';

interface ApplicationTimelineProps {
  applicationId: string;
  viewAs: 'candidate' | 'recruiter';
}

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  applicationId,
  viewAs,
}) => {
  const { stages, isLoading, error, currentStageId, refetch } = useStages(
    applicationId,
    viewAs
  );
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active stage on load
  useEffect(() => {
    if (currentStageId && stages.length > 0) {
      const activeElement = document.getElementById(`stage-${currentStageId}`);
      if (activeElement) {
        setTimeout(() => {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300);
      }
    }
  }, [currentStageId, stages.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Failed to load timeline. Please try again.
        </p>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No timeline stages available.</p>
      </div>
    );
  }

  const completedStages = stages.filter(s => s.status === 'completed');
  const progress = Math.round((completedStages.length / stages.length) * 100);

  return (
    <div ref={timelineRef} className="application-timeline">
      {/* Header */}
      <div className="timeline-header mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Application Progress</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {completedStages.length} / {stages.length} completed
          </span>
        </div>
      </div>

      {/* Stage List */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <TimelineStage
            key={stage.id}
            stage={stage}
            isActive={stage.id === currentStageId}
            isLast={index === stages.length - 1}
            viewAs={viewAs}
            applicationId={applicationId}
            onUpdate={refetch}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## 🔐 Security Considerations

### Role-Based Access Control

```typescript
// Ensure proper authorization in tRPC procedures

// Example: candidateRouter
uploadAssignmentAnswer: protectedProcedure
  .input(z.object({
    applicationId: z.string(),
    stageId: z.string(),
    answerFileUrl: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.session;

    // Verify user owns this application
    const application = await applicationRepo.findById(input.applicationId);
    if (!application || application.userId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this application',
      });
    }

    // Verify stage belongs to application
    const stage = application.stages.find(s => s.id === input.stageId);
    if (!stage || stage.type !== 'assignment') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assignment stage not found',
      });
    }

    // Update stage
    await stageService.addStageData(input.applicationId, input.stageId, {
      answerUrl: input.answerFileUrl,
      submittedAt: new Date(),
    });

    // Transition status
    await stageService.updateStageStatus(
      input.applicationId,
      input.stageId,
      'awaiting_recruiter',
      userId
    );
  }),
```

### Data Validation

```typescript
// Use Zod schemas for all inputs

const AssignmentInputSchema = z.object({
  applicationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  documentUrl: z.string().url().optional(),
  isExternalLink: z.boolean(),
  timeLimitHours: z.number().int().min(1).max(168).optional(), // Max 1 week
});

const FeedbackInputSchema = z.object({
  stageId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().min(10).max(1000),
});
```

---

## 📊 Testing Strategy

### Unit Tests

```typescript
// __tests__/services/stageService.test.ts

describe('StageService', () => {
  let stageService: StageService;
  let mockRepo: jest.Mocked<ApplicationStageRepository>;

  beforeEach(() => {
    mockRepo = {
      getStages: jest.fn(),
      addStage: jest.fn(),
      updateStage: jest.fn(),
      getStageById: jest.fn(),
      getApplication: jest.fn(),
      updateApplication: jest.fn(),
    } as any;

    stageService = new StageService(mockRepo, mockTimelineService);
  });

  describe('createStage', () => {
    it('should create assignment stage successfully', async () => {
      mockRepo.getStages.mockResolvedValue([]);
      mockRepo.getApplication.mockResolvedValue({
        isDisqualified: false,
      } as any);

      const result = await stageService.createStage('app-123', {
        type: 'assignment',
        data: {
          type: 'assignment',
          title: 'Backend Challenge',
          description: 'Build a REST API',
          isExternalLink: false,
          sentAt: new Date(),
        },
      });

      expect(result.type).toBe('assignment');
      expect(result.status).toBe('pending');
      expect(mockRepo.addStage).toHaveBeenCalled();
    });

    it('should throw error when max assignments reached', async () => {
      mockRepo.getStages.mockResolvedValue([
        { type: 'assignment' } as any,
        { type: 'assignment' } as any,
        { type: 'assignment' } as any,
      ]);
      mockRepo.getApplication.mockResolvedValue({
        isDisqualified: false,
      } as any);

      await expect(
        stageService.createStage('app-123', {
          type: 'assignment',
          data: {} as any,
        })
      ).rejects.toThrow(MaxStagesError);
    });

    it('should throw error when application is disqualified', async () => {
      mockRepo.getApplication.mockResolvedValue({
        isDisqualified: true,
      } as any);

      await expect(
        stageService.createStage('app-123', {
          type: 'assignment',
          data: {} as any,
        })
      ).rejects.toThrow('Cannot create stages for disqualified application');
    });
  });

  describe('validateStageTransition', () => {
    it('should allow valid assignment transition', async () => {
      const isValid = await (stageService as any).validateStageTransition(
        'pending',
        'in_progress',
        'assignment'
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid transition', async () => {
      const isValid = await (stageService as any).validateStageTransition(
        'pending',
        'completed', // Cannot go directly from pending to completed
        'assignment'
      );

      expect(isValid).toBe(false);
    });
  });
});
```

### E2E Tests

```typescript
// __tests__/e2e/assignment-workflow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Assignment Workflow', () => {
  test('complete assignment flow: create → upload → feedback', async ({
    page,
    context,
  }) => {
    // Login as recruiter
    await page.goto('/login');
    await page.fill('[name="email"]', 'recruiter@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to application
    await page.goto('/recruiter/applications/test-app-id');

    // Create assignment
    await page.click('button:has-text("Give Assignment")');
    await page.fill('[name="title"]', 'Backend Coding Challenge');
    await page.fill('[name="description"]', 'Build a REST API with auth');
    await page.setInputFiles(
      '[name="document"]',
      './test-files/assignment.pdf'
    );
    await page.click('button:has-text("Send Assignment")');

    // Verify assignment created
    await expect(page.locator('text=Backend Coding Challenge')).toBeVisible();

    // Switch to candidate view
    const candidatePage = await context.newPage();
    await candidatePage.goto('/login');
    await candidatePage.fill('[name="email"]', 'candidate@test.com');
    await candidatePage.fill('[name="password"]', 'password123');
    await candidatePage.click('button[type="submit"]');

    // Navigate to application
    await candidatePage.goto('/candidate/applications/test-app-id');

    // Upload assignment answer
    await candidatePage.click('button:has-text("Upload Answer")');
    await candidatePage.setInputFiles(
      '[name="answer"]',
      './test-files/answer.pdf'
    );
    await candidatePage.click('button:has-text("Submit")');

    // Verify upload success
    await expect(
      candidatePage.locator('text=Answer submitted successfully')
    ).toBeVisible();

    // Back to recruiter: provide feedback
    await page.reload();
    await page.click('button:has-text("View Submission")');
    await page.click('button:has-text("Provide Feedback")');
    await page.click('[data-rating="4"]'); // 4 stars
    await page.fill(
      '[name="comments"]',
      'Great solution! Clean code and good error handling.'
    );
    await page.click('button:has-text("Submit Feedback")');

    // Verify feedback provided
    await expect(page.locator('text=Feedback submitted')).toBeVisible();

    // Candidate should see feedback
    await candidatePage.reload();
    await expect(candidatePage.locator('text=Great solution!')).toBeVisible();
    await expect(candidatePage.locator('[data-rating="4"]')).toBeVisible();
  });
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Database migration tested on staging
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated

### Deployment Steps

1. **Database Backup**

   ```bash
   mongodump --uri="$PROD_MONGO_URI" --out=./backup-$(date +%Y%m%d-%H%M%S)
   ```

2. **Run Migration (Dry Run First)**

   ```bash
   NODE_ENV=production node scripts/migrations/migrate-to-stages.js --dry-run
   ```

3. **Run Migration (Execute)**

   ```bash
   NODE_ENV=production node scripts/migrations/migrate-to-stages.js --execute
   ```

4. **Create Indexes**

   ```bash
   node scripts/create-stage-indexes.js
   ```

5. **Deploy Application**

   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

6. **Enable Feature Flag (Gradual Rollout)**

   ```bash
   # Enable for 10% of users
   vercel env add ENABLE_DYNAMIC_TIMELINE_PERCENT 10
   ```

7. **Monitor**
   - Watch error logs in Sentry
   - Monitor performance in Vercel Analytics
   - Track user adoption metrics
   - Check for support tickets

### Rollback Plan

If issues arise:

1. **Disable Feature Flag**

   ```bash
   vercel env add ENABLE_DYNAMIC_TIMELINE_PERCENT 0
   ```

2. **Rollback Database (if needed)**

   ```bash
   mongorestore --uri="$PROD_MONGO_URI" --dir=./backup-20251108-143000
   ```

3. **Revert Code**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

---

## 📞 Support & Communication

### Team Contacts

- **Backend Lead**: [Name] - backend-lead@company.com
- **Frontend Lead**: [Name] - frontend-lead@company.com
- **Product Manager**: [Name] - pm@company.com
- **DevOps**: [Name] - devops@company.com

### Daily Standup

- **Time**: 10:00 AM daily
- **Duration**: 15 minutes
- **Format**: What did you do? What will you do? Any blockers?

### Sprint Reviews

- **Frequency**: End of each sprint (every 2 weeks)
- **Participants**: Dev team + PM + stakeholders
- **Format**: Demo + retrospective

### Slack Channels

- `#epic5-dynamic-timeline` - Main discussion
- `#dev-backend` - Backend questions
- `#dev-frontend` - Frontend questions
- `#incidents` - Production issues

---

## 📚 Additional Resources

### Documentation

- [Epic 5 PRD](/docs/stories/epic-5/epic-5-dynamic-timeline-system.md)
- [Frontend Architecture](/docs/frontend-architecture-epic5.md)
- [API Contracts](/docs/stories/epic-5/ep5-api-and-data-contracts.md)
- [Coding Standards](/docs/architecture/coding-standards.md)

### External Dependencies

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Azure Blob Storage SDK](https://learn.microsoft.com/en-us/azure/storage/blobs/)
- [Google Calendar API](https://developers.google.com/calendar/api)

### Tools

- **MongoDB Compass** - Database GUI
- **Postman** - API testing
- **Storybook** - Component documentation
- **Playwright** - E2E testing
- **Sentry** - Error monitoring

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Prepared By**: Winston, the Architect 🏗️

**Ready to start building? Let's transform this application workflow! 🚀**
