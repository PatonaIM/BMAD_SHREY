/**
 * Application Helper Functions
 *
 * Utility functions for working with Application objects and their stages.
 * Provides convenient methods for stage lookup, status checks, and progress tracking.
 *
 * @module applicationHelpers
 */

import type { Application } from '../shared/types/application';
import type {
  ApplicationStage,
  StageType,
} from '../shared/types/applicationStage';
import { sortStagesByOrder } from './stageHelpers';

/**
 * Get a stage by its ID from an application
 *
 * @param application - Application object
 * @param stageId - ID of the stage to find
 * @returns Stage if found, undefined otherwise
 */
export function getStageById(
  application: Application,
  stageId: string
): ApplicationStage | undefined {
  if (!application.stages || application.stages.length === 0) {
    return undefined;
  }

  return application.stages.find(stage => stage.id === stageId);
}

/**
 * Get the current active stage for an application
 *
 * @param application - Application object
 * @returns Current stage if found, undefined otherwise
 */
export function getCurrentStage(
  application: Application
): ApplicationStage | undefined {
  if (!application.currentStageId || !application.stages) {
    return undefined;
  }

  return getStageById(application, application.currentStageId);
}

/**
 * Get all stages of a specific type
 *
 * @param application - Application object
 * @param type - Stage type to filter by
 * @returns Array of stages matching the type
 */
export function getStagesByType(
  application: Application,
  type: StageType
): ApplicationStage[] {
  if (!application.stages || application.stages.length === 0) {
    return [];
  }

  return application.stages.filter(stage => stage.type === type);
}

/**
 * Get all completed stages
 *
 * @param application - Application object
 * @returns Array of completed stages
 */
export function getCompletedStages(
  application: Application
): ApplicationStage[] {
  if (!application.stages || application.stages.length === 0) {
    return [];
  }

  return application.stages.filter(stage => stage.status === 'completed');
}

/**
 * Get all pending stages
 *
 * @param application - Application object
 * @returns Array of pending stages
 */
export function getPendingStages(application: Application): ApplicationStage[] {
  if (!application.stages || application.stages.length === 0) {
    return [];
  }

  return application.stages.filter(stage => stage.status === 'pending');
}

/**
 * Get stages visible to candidate
 *
 * @param application - Application object
 * @returns Array of stages visible to candidate
 */
export function getVisibleStages(application: Application): ApplicationStage[] {
  if (!application.stages || application.stages.length === 0) {
    return [];
  }

  return application.stages.filter(stage => stage.visibleToCandidate);
}

/**
 * Get stages sorted by order
 *
 * @param application - Application object
 * @returns Array of stages sorted by order
 */
export function getSortedStages(application: Application): ApplicationStage[] {
  if (!application.stages || application.stages.length === 0) {
    return [];
  }

  return sortStagesByOrder(application.stages);
}

/**
 * Get the next pending stage in order
 *
 * @param application - Application object
 * @returns Next pending stage if found, undefined otherwise
 */
export function getNextPendingStage(
  application: Application
): ApplicationStage | undefined {
  const sortedStages = getSortedStages(application);
  return sortedStages.find(stage => stage.status === 'pending');
}

/**
 * Calculate application progress percentage
 *
 * @param application - Application object
 * @returns Progress percentage (0-100)
 */
export function getApplicationProgress(application: Application): number {
  if (!application.stages || application.stages.length === 0) {
    return 0;
  }

  const completedCount = getCompletedStages(application).length;
  return Math.round((completedCount / application.stages.length) * 100);
}

/**
 * Check if application is in active progress
 * (has stages in progress or awaiting action)
 *
 * @param application - Application object
 * @returns True if application is active
 */
export function isApplicationActive(application: Application): boolean {
  if (!application.stages || application.stages.length === 0) {
    return false;
  }

  // Check for disqualification
  if (application.isDisqualified) {
    return false;
  }

  // Check if any stages are in progress or awaiting
  return application.stages.some(
    stage =>
      stage.status === 'in_progress' ||
      stage.status === 'awaiting_candidate' ||
      stage.status === 'awaiting_recruiter'
  );
}

/**
 * Check if application journey is complete
 * (offer accepted or disqualified)
 *
 * @param application - Application object
 * @returns True if journey is complete
 */
export function isApplicationComplete(application: Application): boolean {
  if (!application.stages || application.stages.length === 0) {
    return false;
  }

  // Check for offer accepted
  const hasOfferAccepted = application.stages.some(
    stage => stage.type === 'offer_accepted' && stage.status === 'completed'
  );

  // Check for disqualification
  if (application.isDisqualified) {
    return true;
  }

  return hasOfferAccepted;
}

/**
 * Check if application has a specific stage type
 *
 * @param application - Application object
 * @param type - Stage type to check
 * @returns True if application has this stage type
 */
export function hasStageType(
  application: Application,
  type: StageType
): boolean {
  if (!application.stages || application.stages.length === 0) {
    return false;
  }

  return application.stages.some(stage => stage.type === type);
}

/**
 * Get the first stage (should be submit_application)
 *
 * @param application - Application object
 * @returns First stage if exists, undefined otherwise
 */
export function getFirstStage(
  application: Application
): ApplicationStage | undefined {
  const sorted = getSortedStages(application);
  return sorted[0];
}

/**
 * Get the last stage in order
 *
 * @param application - Application object
 * @returns Last stage if exists, undefined otherwise
 */
export function getLastStage(
  application: Application
): ApplicationStage | undefined {
  const sorted = getSortedStages(application);
  return sorted[sorted.length - 1];
}

/**
 * Count stages by status
 *
 * @param application - Application object
 * @returns Object with counts for each status
 */
export function getStageStatusCounts(application: Application): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  skipped: number;
  awaitingCandidate: number;
  awaitingRecruiter: number;
} {
  if (!application.stages || application.stages.length === 0) {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
      awaitingCandidate: 0,
      awaitingRecruiter: 0,
    };
  }

  return {
    total: application.stages.length,
    pending: application.stages.filter(s => s.status === 'pending').length,
    inProgress: application.stages.filter(s => s.status === 'in_progress')
      .length,
    completed: application.stages.filter(s => s.status === 'completed').length,
    skipped: application.stages.filter(s => s.status === 'skipped').length,
    awaitingCandidate: application.stages.filter(
      s => s.status === 'awaiting_candidate'
    ).length,
    awaitingRecruiter: application.stages.filter(
      s => s.status === 'awaiting_recruiter'
    ).length,
  };
}

/**
 * Get time elapsed since application started
 *
 * @param application - Application object
 * @returns Time elapsed in milliseconds
 */
export function getApplicationDuration(application: Application): number {
  const startTime = application.journeyStartedAt || application.appliedAt;
  const endTime = application.journeyCompletedAt || new Date();

  return endTime.getTime() - startTime.getTime();
}

/**
 * Get time elapsed in days since application started
 *
 * @param application - Application object
 * @returns Time elapsed in days
 */
export function getApplicationDurationDays(application: Application): number {
  const durationMs = getApplicationDuration(application);
  return Math.floor(durationMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if application is awaiting candidate action
 *
 * @param application - Application object
 * @returns True if awaiting candidate
 */
export function isAwaitingCandidate(application: Application): boolean {
  const currentStage = getCurrentStage(application);
  return currentStage?.status === 'awaiting_candidate';
}

/**
 * Check if application is awaiting recruiter action
 *
 * @param application - Application object
 * @returns True if awaiting recruiter
 */
export function isAwaitingRecruiter(application: Application): boolean {
  const currentStage = getCurrentStage(application);
  return currentStage?.status === 'awaiting_recruiter';
}

/**
 * Get summary of application stage journey
 *
 * @param application - Application object
 * @returns Summary object with key metrics
 */
export function getApplicationStageSummary(application: Application): {
  totalStages: number;
  completedStages: number;
  currentStage: ApplicationStage | undefined;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
  durationDays: number;
  awaitingAction: 'candidate' | 'recruiter' | 'none';
} {
  const currentStage = getCurrentStage(application);
  const completedStages = getCompletedStages(application);

  let awaitingAction: 'candidate' | 'recruiter' | 'none' = 'none';
  if (isAwaitingCandidate(application)) {
    awaitingAction = 'candidate';
  } else if (isAwaitingRecruiter(application)) {
    awaitingAction = 'recruiter';
  }

  return {
    totalStages: application.stages?.length || 0,
    completedStages: completedStages.length,
    currentStage,
    progress: getApplicationProgress(application),
    isActive: isApplicationActive(application),
    isComplete: isApplicationComplete(application),
    durationDays: getApplicationDurationDays(application),
    awaitingAction,
  };
}
