/**
 * Stage Validation Functions
 *
 * Functions for validating stage transitions, data integrity,
 * and business rules for application stages.
 *
 * @module stageValidation
 */

import {
  ApplicationStage,
  StageType,
  StageStatus,
  isSubmitApplicationData,
  isAiInterviewData,
  isAssignmentData,
  isLiveInterviewData,
  isOfferData,
  isOfferAcceptedData,
  isDisqualifiedData,
} from '@/shared/types/applicationStage';
import { getStageById, sortStagesByOrder } from './stageHelpers';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid stage type transitions
 * Maps current stage type to allowed next stage types
 */
const VALID_STAGE_TRANSITIONS: Record<StageType, StageType[]> = {
  submit_application: [
    'ai_interview',
    'under_review',
    'assignment',
    'live_interview',
    'disqualified',
  ],
  ai_interview: [
    'under_review',
    'assignment',
    'live_interview',
    'offer',
    'disqualified',
  ],
  under_review: [
    'ai_interview',
    'assignment',
    'live_interview',
    'offer',
    'disqualified',
  ],
  assignment: ['under_review', 'live_interview', 'offer', 'disqualified'],
  live_interview: [
    'under_review',
    'assignment',
    'live_interview', // Multiple interviews allowed
    'offer',
    'disqualified',
  ],
  offer: ['offer_accepted', 'disqualified'],
  offer_accepted: [], // Terminal state
  disqualified: [], // Terminal state
};

/**
 * Valid status transitions for a single stage
 */
const VALID_STATUS_TRANSITIONS: Record<StageStatus, StageStatus[]> = {
  pending: [
    'in_progress',
    'awaiting_candidate',
    'awaiting_recruiter',
    'skipped',
  ],
  in_progress: [
    'awaiting_candidate',
    'awaiting_recruiter',
    'completed',
    'skipped',
  ],
  awaiting_candidate: ['in_progress', 'completed', 'skipped'],
  awaiting_recruiter: ['in_progress', 'completed', 'skipped'],
  completed: [], // Terminal state for a stage
  skipped: [], // Terminal state for a stage
};

/**
 * Validate a stage transition
 *
 * @param currentStage - Current stage
 * @param nextStageType - Type of next stage to add
 * @returns Validation result
 */
export function validateStageTransition(
  currentStage: ApplicationStage,
  nextStageType: StageType
): ValidationResult {
  const errors: string[] = [];

  // Check if current stage is complete
  if (
    currentStage.status !== 'completed' &&
    currentStage.status !== 'skipped'
  ) {
    errors.push(
      'Current stage must be completed or skipped before adding next stage'
    );
  }

  // Check if transition is allowed
  const allowedTypes = VALID_STAGE_TRANSITIONS[currentStage.type];
  if (!allowedTypes.includes(nextStageType)) {
    errors.push(
      `Cannot transition from ${currentStage.type} to ${nextStageType}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a status change for a stage
 *
 * @param stage - Stage to validate
 * @param newStatus - New status to transition to
 * @returns Validation result
 */
export function validateStatusChange(
  stage: ApplicationStage,
  newStatus: StageStatus
): ValidationResult {
  const errors: string[] = [];
  const allowedStatuses = VALID_STATUS_TRANSITIONS[stage.status];

  if (!allowedStatuses.includes(newStatus)) {
    errors.push(
      `Cannot transition from ${stage.status} to ${newStatus} for stage ${stage.type}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate stage data matches its type
 *
 * @param stage - Stage to validate
 * @returns Validation result
 */
export function validateStageData(stage: ApplicationStage): ValidationResult {
  const errors: string[] = [];

  // Check that data.type matches stage.type
  if (stage.data.type !== stage.type) {
    errors.push(
      `Stage type ${stage.type} does not match data type ${stage.data.type}`
    );
  }

  // Type-specific validation using type guards
  switch (stage.type) {
    case 'submit_application':
      if (isSubmitApplicationData(stage.data)) {
        if (!stage.data.submittedAt) {
          errors.push('submit_application stage must have submittedAt');
        }
      }
      break;

    case 'ai_interview':
      if (isAiInterviewData(stage.data)) {
        if (!stage.data.interviewCompletedAt && stage.status === 'completed') {
          errors.push(
            'Completed ai_interview stage must have interviewCompletedAt'
          );
        }
      }
      break;

    case 'assignment':
      if (isAssignmentData(stage.data)) {
        if (!stage.data.sentAt) {
          errors.push('assignment stage must have sentAt');
        }
        if (stage.status === 'completed' && !stage.data.submittedAt) {
          errors.push('Completed assignment must have submittedAt');
        }
      }
      break;

    case 'live_interview':
      if (isLiveInterviewData(stage.data)) {
        if (!stage.data.scheduledTime && !stage.data.availableSlots) {
          errors.push(
            'live_interview stage must have scheduledTime or availableSlots'
          );
        }
        if (stage.status === 'completed' && !stage.data.completedAt) {
          errors.push('Completed live_interview must have completedAt');
        }
      }
      break;

    case 'offer':
      if (isOfferData(stage.data)) {
        if (!stage.data.sentAt) {
          errors.push('offer stage must have sentAt');
        }
        if (stage.status === 'completed' && !stage.data.expiresAt) {
          errors.push('offer stage should have expiresAt');
        }
      }
      break;

    case 'offer_accepted':
      if (isOfferAcceptedData(stage.data)) {
        if (!stage.data.acceptedAt) {
          errors.push('offer_accepted stage must have acceptedAt');
        }
      }
      break;

    case 'disqualified':
      if (isDisqualifiedData(stage.data)) {
        if (!stage.data.disqualifiedAt) {
          errors.push('disqualified stage must have disqualifiedAt');
        }
        if (!stage.data.reason) {
          errors.push('disqualified stage must have reason');
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entire stages array
 *
 * @param stages - Array of stages to validate
 * @returns Validation result
 */
export function validateStages(stages: ApplicationStage[]): ValidationResult {
  const errors: string[] = [];

  if (stages.length === 0) {
    errors.push('Application must have at least one stage');
    return { valid: false, errors };
  }

  // Check first stage is submit_application
  const sortedStages = sortStagesByOrder(stages);
  const firstStage = sortedStages[0];
  if (firstStage && firstStage.type !== 'submit_application') {
    errors.push('First stage must be submit_application');
  }

  // Check for duplicate order values
  const orders = stages.map(s => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    errors.push('Stages have duplicate order values');
  }

  // Check each stage has valid data
  stages.forEach((stage, index) => {
    const dataValidation = validateStageData(stage);
    if (!dataValidation.valid) {
      errors.push(
        `Stage ${index} (${stage.type}): ${dataValidation.errors.join(', ')}`
      );
    }
  });

  // Check for multiple terminal states
  const offerAccepted = stages.filter(s => s.type === 'offer_accepted');
  const disqualified = stages.filter(s => s.type === 'disqualified');

  if (offerAccepted.length > 1) {
    errors.push('Cannot have multiple offer_accepted stages');
  }

  if (disqualified.length > 1) {
    errors.push('Cannot have multiple disqualified stages');
  }

  if (offerAccepted.length > 0 && disqualified.length > 0) {
    errors.push('Cannot have both offer_accepted and disqualified stages');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a stage can be deleted
 *
 * @param stages - All stages
 * @param stageId - ID of stage to delete
 * @returns Validation result
 */
export function canDeleteStage(
  stages: ApplicationStage[],
  stageId: string
): ValidationResult {
  const errors: string[] = [];
  const stage = getStageById(stages, stageId);

  if (!stage) {
    errors.push('Stage not found');
    return { valid: false, errors };
  }

  // Cannot delete submit_application stage
  if (stage.type === 'submit_application') {
    errors.push('Cannot delete submit_application stage');
  }

  // Cannot delete completed stages
  if (stage.status === 'completed') {
    errors.push('Cannot delete completed stage');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a stage can be edited
 *
 * @param stage - Stage to check
 * @param field - Field to edit
 * @returns Validation result
 */
export function canEditStage(
  stage: ApplicationStage,
  field: keyof ApplicationStage
): ValidationResult {
  const errors: string[] = [];

  // Completed stages can only edit internal fields
  if (stage.status === 'completed') {
    const editableFields: Array<keyof ApplicationStage> = [
      'visibleToCandidate',
      'title',
    ];

    if (!editableFields.includes(field)) {
      errors.push(`Cannot edit ${String(field)} on completed stage`);
    }
  }

  // Cannot change type once created
  if (field === 'type') {
    errors.push('Cannot change stage type after creation');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that stage order values are sequential
 *
 * @param stages - Array of stages
 * @returns Validation result with reordered stages if invalid
 */
export function normalizeStageOrder(
  stages: ApplicationStage[]
): ApplicationStage[] {
  const sorted = sortStagesByOrder(stages);

  return sorted.map((stage, index) => ({
    ...stage,
    order: index,
  }));
}

/**
 * Check if application can add another stage of a specific type
 *
 * @param stages - Existing stages
 * @param type - Type to add
 * @returns Validation result
 */
export function canAddStageType(
  stages: ApplicationStage[],
  type: StageType
): ValidationResult {
  const errors: string[] = [];

  // Only one submit_application allowed
  if (type === 'submit_application' && stages.some(s => s.type === type)) {
    errors.push('Only one submit_application stage allowed');
  }

  // Only one offer_accepted allowed
  if (type === 'offer_accepted' && stages.some(s => s.type === type)) {
    errors.push('Only one offer_accepted stage allowed');
  }

  // Only one disqualified allowed
  if (type === 'disqualified' && stages.some(s => s.type === type)) {
    errors.push('Only one disqualified stage allowed');
  }

  // Cannot add stages after terminal state
  const hasTerminal = stages.some(
    s =>
      (s.type === 'offer_accepted' || s.type === 'disqualified') &&
      s.status === 'completed'
  );

  if (hasTerminal) {
    errors.push('Cannot add stages after offer_accepted or disqualified');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
