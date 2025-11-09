/**
 * Stage Helper Functions
 *
 * Utility functions for working with application stages.
 * These helpers provide stage creation, querying, and manipulation logic.
 *
 * @module stageHelpers
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ApplicationStage,
  StageType,
  StageStatus,
  StageData,
} from '@/shared/types/applicationStage';

/**
 * Stage title mapping for display purposes
 */
const STAGE_TITLES: Record<StageType, string> = {
  submit_application: 'Application Submitted',
  ai_interview: 'AI Video Interview',
  under_review: 'Under Review',
  assignment: 'Technical Assignment',
  live_interview: 'Live Interview',
  offer: 'Job Offer',
  offer_accepted: 'Offer Accepted',
  disqualified: 'Application Closed',
};

/**
 * Stage icon mapping (icon names from your icon library)
 */
const STAGE_ICONS: Record<StageType, string> = {
  submit_application: 'file-text',
  ai_interview: 'video',
  under_review: 'eye',
  assignment: 'code',
  live_interview: 'users',
  offer: 'gift',
  offer_accepted: 'check-circle',
  disqualified: 'x-circle',
};

/**
 * Create a new application stage
 *
 * @param type - Type of stage to create
 * @param data - Stage-specific data
 * @param options - Additional options (title, visibility, etc.)
 * @returns Newly created ApplicationStage
 */
export function createStage(
  type: StageType,
  data: StageData,
  options: {
    applicationId: string;
    createdBy: string;
    order?: number;
    status?: StageStatus;
    title?: string;
    visibleToCandidate?: boolean;
  }
): ApplicationStage {
  const now = new Date();

  return {
    id: uuidv4(),
    applicationId: options.applicationId,
    type,
    order: options.order ?? 0,
    status: options.status ?? 'pending',
    title: options.title,
    visibleToCandidate: options.visibleToCandidate ?? true,
    data,
    createdAt: now,
    updatedAt: now,
    completedAt: options.status === 'completed' ? now : undefined,
    createdBy: options.createdBy,
    updatedBy: options.createdBy,
    candidateActions: [],
    recruiterActions: [],
  };
}

/**
 * Get display title for a stage type
 *
 * @param type - Stage type
 * @param customTitle - Optional custom title override
 * @returns Display title string
 */
export function getStageTitle(type: StageType, customTitle?: string): string {
  return customTitle || STAGE_TITLES[type];
}

/**
 * Get icon name for a stage type
 *
 * @param type - Stage type
 * @returns Icon name string
 */
export function getStageIcon(type: StageType): string {
  return STAGE_ICONS[type];
}

/**
 * Check if a stage is completed
 *
 * @param stage - Application stage to check
 * @returns True if stage is completed
 */
export function isStageComplete(stage: ApplicationStage): boolean {
  return stage.status === 'completed';
}

/**
 * Check if a stage is pending
 *
 * @param stage - Application stage to check
 * @returns True if stage is pending
 */
export function isStagePending(stage: ApplicationStage): boolean {
  return stage.status === 'pending';
}

/**
 * Check if a stage is in progress
 *
 * @param stage - Application stage to check
 * @returns True if stage is in progress or awaiting someone
 */
export function isStageInProgress(stage: ApplicationStage): boolean {
  return (
    stage.status === 'in_progress' ||
    stage.status === 'awaiting_candidate' ||
    stage.status === 'awaiting_recruiter'
  );
}

/**
 * Get the next pending stage from a list of stages
 *
 * @param stages - Array of application stages
 * @param afterStageId - Optional stage ID to find next stage after
 * @returns Next pending stage or null if none found
 */
export function getNextPendingStage(
  stages: ApplicationStage[],
  afterStageId?: string
): ApplicationStage | null {
  const sortedStages = sortStagesByOrder(stages);

  if (!afterStageId) {
    // Return first pending stage
    return sortedStages.find(isStagePending) || null;
  }

  // Find stage after the specified one
  const afterStageIndex = sortedStages.findIndex(s => s.id === afterStageId);
  if (afterStageIndex === -1) return null;

  const remainingStages = sortedStages.slice(afterStageIndex + 1);
  return remainingStages.find(isStagePending) || null;
}

/**
 * Get the currently active stage (first in-progress or pending stage)
 *
 * @param stages - Array of application stages
 * @returns Active stage or null if all completed/skipped
 */
export function getActiveStage(
  stages: ApplicationStage[]
): ApplicationStage | null {
  const sortedStages = sortStagesByOrder(stages);

  // First, look for any in-progress stage
  const inProgressStage = sortedStages.find(isStageInProgress);
  if (inProgressStage) return inProgressStage;

  // If none in progress, return first pending
  return sortedStages.find(isStagePending) || null;
}

/**
 * Sort stages by their order field
 *
 * @param stages - Array of application stages
 * @returns Sorted array of stages
 */
export function sortStagesByOrder(
  stages: ApplicationStage[]
): ApplicationStage[] {
  return [...stages].sort((a, b) => a.order - b.order);
}

/**
 * Filter stages by type
 *
 * @param stages - Array of application stages
 * @param type - Stage type to filter by
 * @returns Filtered array of stages
 */
export function getStagesByType(
  stages: ApplicationStage[],
  type: StageType
): ApplicationStage[] {
  return stages.filter(stage => stage.type === type);
}

/**
 * Count stages by type
 *
 * @param stages - Array of application stages
 * @param type - Stage type to count
 * @returns Number of stages of the specified type
 */
export function countStagesByType(
  stages: ApplicationStage[],
  type: StageType
): number {
  return getStagesByType(stages, type).length;
}

/**
 * Get visible stages for a role
 *
 * @param stages - Array of application stages
 * @param role - User role ('candidate' or 'recruiter')
 * @returns Filtered array of visible stages
 */
export function getVisibleStages(
  stages: ApplicationStage[],
  role: 'candidate' | 'recruiter'
): ApplicationStage[] {
  if (role === 'recruiter') {
    return stages; // Recruiters see all stages
  }

  // Candidates only see stages marked as visible
  return stages.filter(stage => stage.visibleToCandidate);
}

/**
 * Calculate progress percentage
 *
 * @param stages - Array of application stages
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(stages: ApplicationStage[]): number {
  if (stages.length === 0) return 0;

  const completedCount = stages.filter(isStageComplete).length;
  return Math.round((completedCount / stages.length) * 100);
}

/**
 * Get stage by ID
 *
 * @param stages - Array of application stages
 * @param stageId - Stage ID to find
 * @returns Stage or null if not found
 */
export function getStageById(
  stages: ApplicationStage[],
  stageId: string
): ApplicationStage | null {
  return stages.find(stage => stage.id === stageId) || null;
}

/**
 * Calculate new order value for inserting a stage
 *
 * @param stages - Existing stages
 * @param insertAfterStageId - ID of stage to insert after (undefined = append to end)
 * @returns New order value
 */
export function calculateNewStageOrder(
  stages: ApplicationStage[],
  insertAfterStageId?: string
): number {
  if (stages.length === 0) return 0;

  if (!insertAfterStageId) {
    // Append to end
    const maxOrder = Math.max(...stages.map(s => s.order));
    return maxOrder + 1;
  }

  const afterStage = getStageById(stages, insertAfterStageId);
  if (!afterStage) {
    throw new Error(`Stage ${insertAfterStageId} not found`);
  }

  // Insert after specified stage (use fractional order for flexibility)
  return afterStage.order + 0.5;
}

/**
 * Check if application journey is complete
 *
 * @param stages - Array of application stages
 * @returns True if journey is complete (offer accepted or disqualified)
 */
export function isJourneyComplete(stages: ApplicationStage[]): boolean {
  return stages.some(
    stage =>
      (stage.type === 'offer_accepted' && isStageComplete(stage)) ||
      (stage.type === 'disqualified' && isStageComplete(stage))
  );
}

/**
 * Get completion statistics
 *
 * @param stages - Array of application stages
 * @returns Statistics object
 */
export function getStageStatistics(stages: ApplicationStage[]): {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  skipped: number;
  progress: number;
} {
  const completed = stages.filter(isStageComplete).length;
  const pending = stages.filter(isStagePending).length;
  const inProgress = stages.filter(isStageInProgress).length;
  const skipped = stages.filter(s => s.status === 'skipped').length;

  return {
    total: stages.length,
    completed,
    pending,
    inProgress,
    skipped,
    progress: calculateProgress(stages),
  };
}
