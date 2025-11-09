import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { stageService } from '../../services/stageService';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import type {
  StageType,
  StageStatus,
  StageData,
} from '@/shared/types/applicationStage';
import { logger } from '../../monitoring/logger';

const t = initTRPC.context<Context>().create();

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx });
});

// Middleware to verify user owns the application
const ownsApplication = t.middleware(async ({ ctx, next, rawInput }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User ID not found in session',
    });
  }

  const input = rawInput as { applicationId: string };
  if (!input.applicationId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'applicationId is required',
    });
  }

  // Get application and check ownership
  const application = await applicationRepo.findById(input.applicationId);
  if (!application) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Application not found',
    });
  }

  // Check if user is either the candidate or a recruiter for this job
  const userId = ctx.session.user.id;
  const roles = (ctx.session.user as { roles?: string[] })?.roles || [];

  const isCandidate = application.userId === userId;
  const isRecruiter = roles.includes('RECRUITER') || roles.includes('ADMIN');

  if (!isCandidate && !isRecruiter) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this application',
    });
  }

  return next({
    ctx: {
      ...ctx,
      application,
      isCandidate,
      isRecruiter,
      userId,
    },
  });
});

// Input validation schemas
const CreateStageSchema = z.object({
  applicationId: z.string(),
  type: z.enum([
    'submit_application',
    'ai_interview',
    'under_review',
    'assignment',
    'live_interview',
    'offer',
    'offer_accepted',
    'disqualified',
  ]),
  title: z.string().optional(),
  visibleToCandidate: z.boolean().default(true),
  data: z.record(z.unknown()), // Polymorphic data, validated in service layer
});

const UpdateStageStatusSchema = z.object({
  applicationId: z.string(),
  stageId: z.string(),
  newStatus: z.enum([
    'pending',
    'awaiting_candidate',
    'in_progress',
    'awaiting_recruiter',
    'completed',
    'skipped',
  ]),
});

const AddStageDataSchema = z.object({
  applicationId: z.string(),
  stageId: z.string(),
  data: z.record(z.unknown()), // Polymorphic data
});

const GetStagesSchema = z.object({
  applicationId: z.string(),
  viewAs: z.enum(['candidate', 'recruiter']).optional(),
});

const GetActiveStageSchema = z.object({
  applicationId: z.string(),
});

const DeleteStageSchema = z.object({
  applicationId: z.string(),
  stageId: z.string(),
});

const GetStagesByTypeSchema = z.object({
  applicationId: z.string(),
  type: z.enum([
    'submit_application',
    'ai_interview',
    'under_review',
    'assignment',
    'live_interview',
    'offer',
    'offer_accepted',
    'disqualified',
  ]),
});

const GetStageStatsSchema = z.object({
  applicationId: z.string(),
});

export const stageRouter = t.router({
  /**
   * Create a new stage for an application
   * Recruiter-only action
   */
  create: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(CreateStageSchema)
    .mutation(async ({ ctx, input }) => {
      // Only recruiters can create stages
      if (!ctx.isRecruiter) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only recruiters can create stages',
        });
      }

      try {
        const stage = await stageService.createStage(
          input.applicationId,
          {
            type: input.type as StageType,
            title: input.title,
            status: 'pending',
            visibleToCandidate: input.visibleToCandidate,
            data: input.data as unknown as StageData,
          },
          ctx.userId
        );

        logger.info({
          msg: 'Stage created',
          applicationId: input.applicationId,
          stageId: stage.id,
          stageType: stage.type,
          createdBy: ctx.userId,
        });

        return {
          success: true,
          stage,
        };
      } catch (error) {
        logger.error({
          msg: 'Error creating stage',
          error,
          applicationId: input.applicationId,
          stageType: input.type,
        });

        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create stage',
        });
      }
    }),

  /**
   * Update stage status
   * Both candidate and recruiter can update, depending on current status
   */
  updateStatus: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(UpdateStageStatusSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const stage = await stageService.updateStageStatus(
          input.stageId,
          input.newStatus as StageStatus,
          ctx.userId
        );

        logger.info({
          msg: 'Stage status updated',
          applicationId: input.applicationId,
          stageId: input.stageId,
          newStatus: input.newStatus,
          updatedBy: ctx.userId,
        });

        return {
          success: true,
          stage,
        };
      } catch (error) {
        logger.error({
          msg: 'Error updating stage status',
          error,
          stageId: input.stageId,
          newStatus: input.newStatus,
        });

        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update stage status',
        });
      }
    }),

  /**
   * Add or update stage-specific data
   * Both candidate and recruiter can update, depending on data type
   */
  addData: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(AddStageDataSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const stage = await stageService.addStageData(
          input.stageId,
          input.data as Record<string, unknown>,
          ctx.userId
        );

        logger.info({
          msg: 'Stage data added',
          applicationId: input.applicationId,
          stageId: input.stageId,
          updatedBy: ctx.userId,
        });

        return {
          success: true,
          stage,
        };
      } catch (error) {
        logger.error({
          msg: 'Error adding stage data',
          error,
          stageId: input.stageId,
        });

        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add stage data',
        });
      }
    }),

  /**
   * Get all stages for an application
   * Returns filtered list based on role (candidate vs recruiter)
   */
  list: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(GetStagesSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Determine view role
        const viewAs =
          input.viewAs || (ctx.isCandidate ? 'candidate' : 'recruiter');

        const stages = await stageService.getVisibleStages(
          input.applicationId,
          viewAs
        );

        const activeStage = await stageService.getActiveStage(
          input.applicationId
        );

        const stats = await stageService.getStageStats(input.applicationId);

        return {
          stages,
          activeStage,
          stats,
        };
      } catch (error) {
        logger.error({
          msg: 'Error listing stages',
          error,
          applicationId: input.applicationId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve stages',
        });
      }
    }),

  /**
   * Get the active stage for an application
   */
  getActive: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(GetActiveStageSchema)
    .query(async ({ input }) => {
      try {
        const activeStage = await stageService.getActiveStage(
          input.applicationId
        );

        return {
          activeStage,
        };
      } catch (error) {
        logger.error({
          msg: 'Error getting active stage',
          error,
          applicationId: input.applicationId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve active stage',
        });
      }
    }),

  /**
   * Get stages by type
   */
  getByType: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(GetStagesByTypeSchema)
    .query(async ({ input }) => {
      try {
        const stages = await stageService.getStagesByType(
          input.applicationId,
          input.type as StageType
        );

        return {
          stages,
        };
      } catch (error) {
        logger.error({
          msg: 'Error getting stages by type',
          error,
          applicationId: input.applicationId,
          type: input.type,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve stages by type',
        });
      }
    }),

  /**
   * Get stage statistics
   */
  getStats: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(GetStageStatsSchema)
    .query(async ({ input }) => {
      try {
        const stats = await stageService.getStageStats(input.applicationId);

        return stats;
      } catch (error) {
        logger.error({
          msg: 'Error getting stage stats',
          error,
          applicationId: input.applicationId,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve stage statistics',
        });
      }
    }),

  /**
   * Delete a stage
   * Recruiter-only action
   * Cannot delete completed stages or submit_application
   */
  delete: t.procedure
    .use(isAuthed)
    .use(ownsApplication)
    .input(DeleteStageSchema)
    .mutation(async ({ ctx, input }) => {
      // Only recruiters can delete stages
      if (!ctx.isRecruiter) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only recruiters can delete stages',
        });
      }

      try {
        await stageService.deleteStage(input.stageId, ctx.userId);

        logger.info({
          msg: 'Stage deleted',
          applicationId: input.applicationId,
          stageId: input.stageId,
          deletedBy: ctx.userId,
        });

        return {
          success: true,
          message: 'Stage deleted successfully',
        };
      } catch (error) {
        logger.error({
          msg: 'Error deleting stage',
          error,
          stageId: input.stageId,
        });

        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete stage',
        });
      }
    }),
});
