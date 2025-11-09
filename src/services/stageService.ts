/**
 * Stage Service
 * Manages application stages with business logic, validation, and audit logging
 */

import { applicationStageRepo } from '../data-access/repositories/applicationStageRepo';
import { applicationRepo } from '../data-access/repositories/applicationRepo';
import { TimelineService } from './timelineService';
import type {
  ApplicationStage,
  StageType,
  StageStatus,
  StageData,
  CandidateAction,
  RecruiterAction,
} from '../shared/types/applicationStage';
import { getStageTitle } from '../utils/stageHelpers';

// Business rules: Maximum allowed stages by type
const STAGE_LIMITS: Record<StageType, number> = {
  submit_application: 1,
  ai_interview: 1,
  under_review: 1,
  assignment: 3,
  live_interview: 3,
  offer: 1,
  offer_accepted: 1,
  disqualified: 1,
};

// Valid status transitions
const VALID_TRANSITIONS: Record<StageStatus, StageStatus[]> = {
  pending: [
    'in_progress',
    'awaiting_candidate',
    'awaiting_recruiter',
    'skipped',
  ],
  awaiting_candidate: ['in_progress', 'completed', 'skipped'],
  in_progress: [
    'awaiting_recruiter',
    'awaiting_candidate',
    'completed',
    'skipped',
  ],
  awaiting_recruiter: ['in_progress', 'completed', 'skipped'],
  completed: [], // Terminal state
  skipped: [], // Terminal state
};

// Custom error classes
export class StageNotFoundError extends Error {
  constructor(stageId: string) {
    super(`Stage not found: ${stageId}`);
    this.name = 'StageNotFoundError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: StageStatus, to: StageStatus) {
    super(`Invalid transition from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class MaxStagesExceededError extends BusinessRuleError {
  constructor(type: StageType, current: number, max: number) {
    super(`Maximum ${max} ${type} stages allowed. Current: ${current}`);
    this.name = 'MaxStagesExceededError';
  }
}

export class ApplicationDisqualifiedError extends BusinessRuleError {
  constructor() {
    super('Cannot create stages for disqualified application');
    this.name = 'ApplicationDisqualifiedError';
  }
}

/**
 * Input type for creating a new stage
 */
export interface CreateStageInput {
  type: StageType;
  title?: string;
  status: StageStatus;
  visibleToCandidate: boolean;
  data: StageData;
  candidateActions?: CandidateAction[];
  recruiterActions?: RecruiterAction[];
}

/**
 * StageService handles all stage-related business logic
 */
export class StageService {
  private stageRepo = applicationStageRepo;
  private appRepo = applicationRepo;
  private timelineService: TimelineService;

  constructor() {
    this.timelineService = new TimelineService();
  }

  /**
   * Create a new stage for an application
   * Validates business rules and creates timeline event
   */
  async createStage(
    applicationId: string,
    input: CreateStageInput,
    createdBy: string
  ): Promise<ApplicationStage> {
    // 1. Fetch application to validate
    const application = await this.appRepo.findById(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // 2. Check if application is disqualified
    if (application.isDisqualified) {
      throw new ApplicationDisqualifiedError();
    }

    // 3. Validate business rules (max stages for type)
    await this.validateBusinessRules(applicationId, input.type);

    // 4. Get next order value
    const maxOrder = await this.stageRepo.getMaxOrder(applicationId);
    const order = maxOrder + 1;

    // 5. Create stage record
    const now = new Date();
    const stage: ApplicationStage = {
      id: crypto.randomUUID(),
      applicationId,
      type: input.type,
      title: input.title || getStageTitle(input.type),
      status: input.status,
      order,
      visibleToCandidate: input.visibleToCandidate,
      data: input.data,
      candidateActions: input.candidateActions || [],
      recruiterActions: input.recruiterActions || [],
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    };

    await this.stageRepo.create(stage);

    // 6. Update application's currentStageId if this is the first active stage
    if (
      input.status === 'in_progress' ||
      input.status === 'awaiting_candidate' ||
      input.status === 'awaiting_recruiter'
    ) {
      await this.appRepo.updateCurrentStage(applicationId, stage.id);
    }

    // 7. Create timeline event
    await this.timelineService.addEvent(applicationId, {
      status: `stage_created_${input.type}`,
      actorType: 'recruiter',
      actorId: createdBy,
      metadata: {
        stageId: stage.id,
        stageType: input.type,
        stageTitle: stage.title,
      },
    });

    return stage;
  }

  /**
   * Update stage status with transition validation
   */
  async updateStageStatus(
    stageId: string,
    newStatus: StageStatus,
    updatedBy: string
  ): Promise<void> {
    // 1. Fetch current stage
    const stage = await this.stageRepo.findById(stageId);
    if (!stage) {
      throw new StageNotFoundError(stageId);
    }

    // 2. Validate transition
    this.validateStatusTransition(stage.status, newStatus);

    // 3. Update status
    await this.stageRepo.updateStatus(stageId, newStatus, updatedBy);

    // 4. Update application's currentStageId if status changes
    if (newStatus === 'completed' || newStatus === 'skipped') {
      // Find next pending stage
      const nextStage = await this.getNextPendingStage(stage.applicationId);
      if (nextStage) {
        await this.appRepo.updateCurrentStage(
          stage.applicationId,
          nextStage.id
        );
      }
    }

    // 5. Create timeline event
    await this.timelineService.addEvent(stage.applicationId, {
      status: `stage_status_updated`,
      actorType: 'recruiter',
      actorId: updatedBy,
      metadata: {
        stageId,
        oldStatus: stage.status,
        newStatus,
      },
    });
  }

  /**
   * Add or update stage-specific data
   */
  async addStageData(
    stageId: string,
    data: Partial<StageData>,
    updatedBy: string
  ): Promise<void> {
    // 1. Fetch stage
    const stage = await this.stageRepo.findById(stageId);
    if (!stage) {
      throw new StageNotFoundError(stageId);
    }

    // 2. Merge data
    await this.stageRepo.addStageData(stageId, data as Record<string, unknown>);

    // 3. Create timeline event
    await this.timelineService.addEvent(stage.applicationId, {
      status: 'stage_data_updated',
      actorType: 'recruiter',
      actorId: updatedBy,
      metadata: {
        stageId,
        stageType: stage.type,
      },
    });
  }

  /**
   * Get active stage for an application
   */
  async getActiveStage(
    applicationId: string
  ): Promise<ApplicationStage | null> {
    return this.stageRepo.findActiveStage(applicationId);
  }

  /**
   * Get all stages for an application
   */
  async getStagesByApplicationId(
    applicationId: string
  ): Promise<ApplicationStage[]> {
    return this.stageRepo.findByApplicationId(applicationId);
  }

  /**
   * Get stages by type for an application
   */
  async getStagesByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]> {
    return this.stageRepo.findByType(applicationId, type);
  }

  /**
   * Get next pending stage after current stage
   */
  async getNextPendingStage(
    applicationId: string
  ): Promise<ApplicationStage | null> {
    const pendingStages = await this.stageRepo.findPendingStages(applicationId);
    return pendingStages.length > 0 && pendingStages[0]
      ? pendingStages[0]
      : null;
  }

  /**
   * Check if application can progress to a specific stage type
   */
  async canProgressToStage(
    applicationId: string,
    stageType: StageType
  ): Promise<boolean> {
    try {
      await this.validateBusinessRules(applicationId, stageType);
      return true;
    } catch (error) {
      if (error instanceof MaxStagesExceededError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get visible stages for a specific role
   */
  async getVisibleStages(
    applicationId: string,
    role: 'candidate' | 'recruiter'
  ): Promise<ApplicationStage[]> {
    return this.stageRepo.findVisibleStages(applicationId, role);
  }

  /**
   * Delete a stage (with validation)
   */
  async deleteStage(stageId: string, deletedBy: string): Promise<void> {
    // 1. Fetch stage
    const stage = await this.stageRepo.findById(stageId);
    if (!stage) {
      throw new StageNotFoundError(stageId);
    }

    // 2. Validate: Can only delete pending stages
    if (stage.status !== 'pending') {
      throw new BusinessRuleError(
        `Cannot delete stage with status: ${stage.status}. Only pending stages can be deleted.`
      );
    }

    // 3. Delete stage
    await this.stageRepo.delete(stageId);

    // 4. Create timeline event
    await this.timelineService.addEvent(stage.applicationId, {
      status: 'stage_deleted',
      actorType: 'recruiter',
      actorId: deletedBy,
      metadata: {
        stageId,
        stageType: stage.type,
        stageTitle: stage.title,
      },
    });
  }

  /**
   * Validate business rules for creating a stage
   */
  private async validateBusinessRules(
    applicationId: string,
    stageType: StageType
  ): Promise<void> {
    const existingCount = await this.stageRepo.countByType(
      applicationId,
      stageType
    );
    const maxAllowed = STAGE_LIMITS[stageType];

    if (existingCount >= maxAllowed) {
      throw new MaxStagesExceededError(stageType, existingCount, maxAllowed);
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: StageStatus,
    newStatus: StageStatus
  ): void {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new InvalidTransitionError(currentStatus, newStatus);
    }
  }

  /**
   * Get stage statistics for an application
   */
  async getStageStats(applicationId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    skipped: number;
    progress: number;
  }> {
    const stages = await this.stageRepo.findByApplicationId(applicationId);

    const completed = stages.filter(s => s.status === 'completed').length;
    const inProgress = stages.filter(
      s =>
        s.status === 'in_progress' ||
        s.status === 'awaiting_candidate' ||
        s.status === 'awaiting_recruiter'
    ).length;
    const pending = stages.filter(s => s.status === 'pending').length;
    const skipped = stages.filter(s => s.status === 'skipped').length;

    const progress =
      stages.length > 0 ? Math.round((completed / stages.length) * 100) : 0;

    return {
      total: stages.length,
      completed,
      inProgress,
      pending,
      skipped,
      progress,
    };
  }
}

// Export singleton instance
export const stageService = new StageService();
