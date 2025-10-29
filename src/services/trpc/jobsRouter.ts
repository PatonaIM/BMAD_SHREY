import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { jobRepo } from '../../data-access/repositories/jobRepo';
import { applicationRepo } from '../../data-access/repositories/applicationRepo';
import { logAudit } from '../../monitoring/auditLogger';

const t = initTRPC.context<Context>().create();

export const jobsRouter = t.router({
  list: t.procedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ input }) => {
      return jobRepo.search({ page: input.page, limit: input.limit });
    }),
  get: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const job =
        (await jobRepo.findByWorkableId(input.id)) ||
        (await jobRepo.findById(input.id));
      if (!job) throw new Error('JOB_NOT_FOUND');
      return job;
    }),
  apply: t.procedure
    .input(
      z.object({
        jobId: z.string(),
        coverLetter: z.string().optional(),
        resumeUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id as string | undefined;
      if (!userId) throw new Error('UNAUTHORIZED');
      const job =
        (await jobRepo.findByWorkableId(input.jobId)) ||
        (await jobRepo.findById(input.jobId));
      if (!job) throw new Error('JOB_NOT_FOUND');
      const existing = await applicationRepo.findByUserAndJob(userId, job._id);
      if (existing)
        return {
          ok: false,
          error: 'ALREADY_APPLIED',
          applicationId: existing._id,
        };
      const app = await applicationRepo.create({
        userId,
        jobId: job._id,
        resumeUrl: input.resumeUrl,
        coverLetter: input.coverLetter,
      });
      logAudit({
        event: 'application_created',
        actorType: 'candidate',
        actorId: userId,
        targetType: 'job',
        targetId: job._id,
        metadata: { applicationId: app._id },
      });
      return { ok: true, applicationId: app._id };
    }),
});
