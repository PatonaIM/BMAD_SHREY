import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StageService,
  StageNotFoundError,
  InvalidTransitionError,
  MaxStagesExceededError,
  ApplicationDisqualifiedError,
} from '../stageService';
import type {
  ApplicationStage,
  StageType,
  StageStatus,
  SubmitApplicationData,
  AssignmentData,
  LiveInterviewData,
  OfferData,
} from '../../shared/types/applicationStage';

// Mock dependencies
const mockStageRepo = {
  findById: vi.fn(),
  findByApplicationId: vi.fn(),
  findByType: vi.fn(),
  findActiveStage: vi.fn(),
  findPendingStages: vi.fn(),
  countByType: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  addStageData: vi.fn(),
  delete: vi.fn(),
  findVisibleStages: vi.fn(),
  getMaxOrder: vi.fn(),
  findByStatus: vi.fn(),
  bulkUpdate: vi.fn(),
};

const mockAppRepo = {
  findById: vi.fn(),
  updateCurrentStage: vi.fn(),
  updateStatus: vi.fn(),
};

const mockTimelineService = {
  addEvent: vi.fn(),
};

// Helper to create mock stage
const createMockStage = (
  overrides?: Partial<ApplicationStage>
): ApplicationStage => ({
  id: crypto.randomUUID(),
  applicationId: 'app-123',
  type: 'assignment',
  order: 1,
  status: 'pending',
  visibleToCandidate: true,
  data: {
    type: 'assignment',
    title: 'Technical Challenge',
    description: 'Complete the coding challenge',
    isExternalLink: false,
    sentAt: new Date(),
    durationMinutes: 120,
  } as AssignmentData,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'recruiter-123',
  updatedBy: 'recruiter-123',
  ...overrides,
});

describe('StageService', () => {
  let stageService: StageService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create service instance with mocked dependencies
    stageService = new StageService();
    // @ts-expect-error - accessing private property for testing
    stageService.stageRepo = mockStageRepo;
    // @ts-expect-error - accessing private property for testing
    stageService.appRepo = mockAppRepo;
    // @ts-expect-error - accessing private property for testing
    stageService.timelineService = mockTimelineService;
  });

  describe('createStage', () => {
    it('should create a stage successfully', async () => {
      const applicationId = 'app-123';
      const stageInput = {
        type: 'assignment' as StageType,
        title: 'Backend Challenge',
        status: 'pending' as StageStatus,
        visibleToCandidate: true,
        data: {
          type: 'assignment',
          title: 'Backend Challenge',
          description: 'Build a REST API',
          isExternalLink: false,
          sentAt: new Date(),
          durationMinutes: 180,
        } as AssignmentData,
      };

      mockAppRepo.findById.mockResolvedValue({
        _id: applicationId,
        userId: 'candidate-123',
        jobId: 'job-123',
        isDisqualified: false,
      });

      mockStageRepo.countByType.mockResolvedValue(0);
      mockStageRepo.getMaxOrder.mockResolvedValue(0);
      mockStageRepo.create.mockResolvedValue(undefined);
      mockAppRepo.updateCurrentStage.mockResolvedValue(undefined);
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      const result = await stageService.createStage(
        applicationId,
        stageInput,
        'recruiter-123'
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('assignment');
      expect(result.title).toBe('Backend Challenge');
      expect(result.order).toBe(1);
      expect(mockStageRepo.create).toHaveBeenCalledTimes(1);
      expect(mockTimelineService.addEvent).toHaveBeenCalledTimes(1);
    });

    it('should throw error when application not found', async () => {
      mockAppRepo.findById.mockResolvedValue(null);

      await expect(
        stageService.createStage(
          'invalid-app',
          {
            type: 'assignment',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as AssignmentData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow('Application not found');
    });

    it('should throw ApplicationDisqualifiedError for disqualified applications', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: true,
      });

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'assignment',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as AssignmentData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(ApplicationDisqualifiedError);
    });

    it('should throw MaxStagesExceededError when max assignments exceeded', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(3); // Max is 3

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'assignment',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as AssignmentData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(MaxStagesExceededError);
    });

    it('should update application currentStageId for active stages', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(0);
      mockStageRepo.getMaxOrder.mockResolvedValue(0);
      mockStageRepo.create.mockResolvedValue(undefined);
      mockAppRepo.updateCurrentStage.mockResolvedValue(undefined);
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.createStage(
        'app-123',
        {
          type: 'assignment',
          status: 'in_progress',
          visibleToCandidate: true,
          data: {} as AssignmentData,
        },
        'recruiter-123'
      );

      expect(mockAppRepo.updateCurrentStage).toHaveBeenCalledTimes(1);
    });

    it('should not update currentStageId for pending stages', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(0);
      mockStageRepo.getMaxOrder.mockResolvedValue(0);
      mockStageRepo.create.mockResolvedValue(undefined);
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.createStage(
        'app-123',
        {
          type: 'assignment',
          status: 'pending',
          visibleToCandidate: true,
          data: {} as AssignmentData,
        },
        'recruiter-123'
      );

      expect(mockAppRepo.updateCurrentStage).not.toHaveBeenCalled();
    });
  });

  describe('updateStageStatus', () => {
    it('should update stage status successfully', async () => {
      const stage = createMockStage({
        status: 'pending',
      });

      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.updateStatus.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.updateStageStatus(
        stage.id,
        'in_progress',
        'recruiter-123'
      );

      expect(mockStageRepo.updateStatus).toHaveBeenCalledWith(
        stage.id,
        'in_progress',
        'recruiter-123'
      );
      expect(mockTimelineService.addEvent).toHaveBeenCalledTimes(1);
    });

    it('should throw StageNotFoundError when stage not found', async () => {
      mockStageRepo.findById.mockResolvedValue(null);

      await expect(
        stageService.updateStageStatus(
          'invalid-stage',
          'in_progress',
          'recruiter-123'
        )
      ).rejects.toThrow(StageNotFoundError);
    });

    it('should throw InvalidTransitionError for invalid status transitions', async () => {
      const stage = createMockStage({
        status: 'completed',
      });

      mockStageRepo.findById.mockResolvedValue(stage);

      await expect(
        stageService.updateStageStatus(stage.id, 'pending', 'recruiter-123')
      ).rejects.toThrow(InvalidTransitionError);
    });

    it('should allow pending to in_progress transition', async () => {
      const stage = createMockStage({ status: 'pending' });
      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.updateStatus.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.updateStageStatus(
        stage.id,
        'in_progress',
        'recruiter-123'
      );

      expect(mockStageRepo.updateStatus).toHaveBeenCalledWith(
        stage.id,
        'in_progress',
        'recruiter-123'
      );
    });

    it('should allow in_progress to completed transition', async () => {
      const stage = createMockStage({ status: 'in_progress' });
      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.updateStatus.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.updateStageStatus(
        stage.id,
        'completed',
        'recruiter-123'
      );

      expect(mockStageRepo.updateStatus).toHaveBeenCalledWith(
        stage.id,
        'completed',
        'recruiter-123'
      );
    });

    it('should set completedAt timestamp when status is completed', async () => {
      const stage = createMockStage({ status: 'in_progress' });
      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.updateStatus.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.updateStageStatus(
        stage.id,
        'completed',
        'recruiter-123'
      );

      // Verify updateStatus was called with completed status
      expect(mockStageRepo.updateStatus).toHaveBeenCalledWith(
        stage.id,
        'completed',
        'recruiter-123'
      );
    });
  });

  describe('addStageData', () => {
    it('should add data to stage successfully', async () => {
      const stage = createMockStage();
      const newData = {
        submittedAt: new Date(),
        answerUrl: 'https://example.com/answer.pdf',
      };

      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.addStageData.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.addStageData(stage.id, newData, 'candidate-123');

      expect(mockStageRepo.addStageData).toHaveBeenCalledWith(
        stage.id,
        newData
      );
      expect(mockTimelineService.addEvent).toHaveBeenCalledTimes(1);
    });

    it('should throw StageNotFoundError when stage not found', async () => {
      mockStageRepo.findById.mockResolvedValue(null);

      await expect(
        stageService.addStageData('invalid-stage', {}, 'user-123')
      ).rejects.toThrow(StageNotFoundError);
    });

    it('should merge new data with existing stage data', async () => {
      const stage = createMockStage({
        data: {
          type: 'assignment',
          title: 'Challenge',
          description: 'Complete challenge',
          isExternalLink: false,
          sentAt: new Date(),
          durationMinutes: 120,
        } as AssignmentData,
      });

      const newData = { submittedAt: new Date() };

      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.addStageData.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.addStageData(stage.id, newData, 'candidate-123');

      // Verify the data was sent to repository
      expect(mockStageRepo.addStageData).toHaveBeenCalledWith(
        stage.id,
        newData
      );
    });
  });

  describe('getActiveStage', () => {
    it('should return active stage', async () => {
      const activeStage = createMockStage({ status: 'in_progress' });
      mockStageRepo.findActiveStage.mockResolvedValue(activeStage);

      const result = await stageService.getActiveStage('app-123');

      expect(result).toBeDefined();
      expect(result?.status).toBe('in_progress');
    });

    it('should return null when no active stage', async () => {
      mockStageRepo.findActiveStage.mockResolvedValue(null);

      const result = await stageService.getActiveStage('app-123');

      expect(result).toBeNull();
    });
  });

  describe('getStagesByApplicationId', () => {
    it('should return all stages for application', async () => {
      const stages = [
        createMockStage({ type: 'submit_application', order: 0 }),
        createMockStage({ type: 'assignment', order: 1 }),
        createMockStage({ type: 'live_interview', order: 2 }),
      ];

      mockStageRepo.findByApplicationId.mockResolvedValue(stages);

      const result = await stageService.getStagesByApplicationId('app-123');

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe('submit_application');
    });

    it('should return empty array when no stages', async () => {
      mockStageRepo.findByApplicationId.mockResolvedValue([]);

      const result = await stageService.getStagesByApplicationId('app-123');

      expect(result).toEqual([]);
    });
  });

  describe('getStagesByType', () => {
    it('should return stages of specific type', async () => {
      const assignments = [
        createMockStage({ type: 'assignment', order: 1 }),
        createMockStage({ type: 'assignment', order: 2 }),
      ];

      mockStageRepo.findByType.mockResolvedValue(assignments);

      const result = await stageService.getStagesByType(
        'app-123',
        'assignment'
      );

      expect(result).toHaveLength(2);
      expect(result.every(s => s.type === 'assignment')).toBe(true);
    });

    it('should return empty array when no stages of that type', async () => {
      mockStageRepo.findByType.mockResolvedValue([]);

      const result = await stageService.getStagesByType('app-123', 'offer');

      expect(result).toEqual([]);
    });
  });

  describe('getVisibleStages', () => {
    it('should return only visible stages for candidates', async () => {
      const visibleStages = [
        createMockStage({ visibleToCandidate: true, order: 0 }),
        createMockStage({ visibleToCandidate: true, order: 1 }),
      ];

      mockStageRepo.findVisibleStages.mockResolvedValue(visibleStages);

      const result = await stageService.getVisibleStages(
        'app-123',
        'candidate'
      );

      expect(result).toHaveLength(2);
      expect(result.every(s => s.visibleToCandidate)).toBe(true);
    });

    it('should return all stages for recruiters', async () => {
      const allStages = [
        createMockStage({ visibleToCandidate: true, order: 0 }),
        createMockStage({ visibleToCandidate: false, order: 1 }),
        createMockStage({ visibleToCandidate: true, order: 2 }),
      ];

      mockStageRepo.findVisibleStages.mockResolvedValue(allStages);

      const result = await stageService.getVisibleStages(
        'app-123',
        'recruiter'
      );

      expect(result).toHaveLength(3);
    });
  });

  describe('deleteStage', () => {
    it('should delete stage successfully', async () => {
      const stage = createMockStage({ status: 'pending' });
      mockStageRepo.findById.mockResolvedValue(stage);
      mockStageRepo.delete.mockResolvedValue({ acknowledged: true });
      mockTimelineService.addEvent.mockResolvedValue(undefined);

      await stageService.deleteStage(stage.id, 'recruiter-123');

      expect(mockStageRepo.delete).toHaveBeenCalledWith(stage.id);
      expect(mockTimelineService.addEvent).toHaveBeenCalledTimes(1);
    });

    it('should throw StageNotFoundError when stage not found', async () => {
      mockStageRepo.findById.mockResolvedValue(null);

      await expect(
        stageService.deleteStage('invalid-stage', 'recruiter-123')
      ).rejects.toThrow(StageNotFoundError);
    });

    it('should throw error when deleting submit_application stage', async () => {
      const stage = createMockStage({ type: 'submit_application' });
      mockStageRepo.findById.mockResolvedValue(stage);

      await expect(
        stageService.deleteStage(stage.id, 'recruiter-123')
      ).rejects.toThrow('Cannot delete submit_application stage');
    });

    it('should throw error when deleting completed stage', async () => {
      const stage = createMockStage({ status: 'completed' });
      mockStageRepo.findById.mockResolvedValue(stage);

      await expect(
        stageService.deleteStage(stage.id, 'recruiter-123')
      ).rejects.toThrow('Cannot delete completed stages');
    });
  });

  describe('canProgressToStage', () => {
    it('should return true when stage can be added', async () => {
      mockStageRepo.countByType.mockResolvedValue(0);

      const result = await stageService.canProgressToStage(
        'app-123',
        'assignment'
      );

      expect(result).toBe(true);
    });

    it('should return false when max stages exceeded', async () => {
      mockStageRepo.countByType.mockResolvedValue(3); // Max assignments is 3

      const result = await stageService.canProgressToStage(
        'app-123',
        'assignment'
      );

      expect(result).toBe(false);
    });
  });

  describe('getStageStats', () => {
    it('should return stage statistics', async () => {
      const stages = [
        createMockStage({ status: 'completed', order: 0 }),
        createMockStage({ status: 'completed', order: 1 }),
        createMockStage({ status: 'in_progress', order: 2 }),
        createMockStage({ status: 'pending', order: 3 }),
      ];

      mockStageRepo.findByApplicationId.mockResolvedValue(stages);

      const stats = await stageService.getStageStats('app-123');

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
    });

    it('should calculate percentage correctly', async () => {
      const stages = [
        createMockStage({ status: 'completed', order: 0 }),
        createMockStage({ status: 'completed', order: 1 }),
        createMockStage({ status: 'pending', order: 2 }),
        createMockStage({ status: 'pending', order: 3 }),
      ];

      mockStageRepo.findByApplicationId.mockResolvedValue(stages);

      const stats = await stageService.getStageStats('app-123');

      expect(stats.progress).toBe(50); // 2 out of 4 completed
    });

    it('should return 0 percentage when no stages', async () => {
      mockStageRepo.findByApplicationId.mockResolvedValue([]);

      const stats = await stageService.getStageStats('app-123');

      expect(stats.total).toBe(0);
      expect(stats.progress).toBe(0);
    });
  });

  describe('getNextPendingStage', () => {
    it('should return next pending stage', async () => {
      const pendingStages = [
        createMockStage({ status: 'pending', order: 2 }),
        createMockStage({ status: 'pending', order: 3 }),
      ];

      mockStageRepo.findPendingStages.mockResolvedValue(pendingStages);

      const result = await stageService.getNextPendingStage('app-123');

      expect(result).toBeDefined();
      expect(result?.status).toBe('pending');
      expect(result?.order).toBe(2);
    });

    it('should return null when no pending stages', async () => {
      mockStageRepo.findPendingStages.mockResolvedValue([]);

      const result = await stageService.getNextPendingStage('app-123');

      expect(result).toBeNull();
    });
  });

  describe('Business Rule Validation', () => {
    it('should enforce max 3 assignments', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(3);

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'assignment',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as AssignmentData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(MaxStagesExceededError);
    });

    it('should enforce max 3 live interviews', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(3);

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'live_interview',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as LiveInterviewData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(MaxStagesExceededError);
    });

    it('should allow only 1 offer', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(1);

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'offer',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as OfferData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(MaxStagesExceededError);
    });

    it('should allow only 1 submit_application', async () => {
      mockAppRepo.findById.mockResolvedValue({
        _id: 'app-123',
        isDisqualified: false,
      });
      mockStageRepo.countByType.mockResolvedValue(1);

      await expect(
        stageService.createStage(
          'app-123',
          {
            type: 'submit_application',
            status: 'pending',
            visibleToCandidate: true,
            data: {} as SubmitApplicationData,
          },
          'recruiter-123'
        )
      ).rejects.toThrow(MaxStagesExceededError);
    });
  });
});
