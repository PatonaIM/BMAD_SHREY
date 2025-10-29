import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { jobRepo } from '../../data-access/repositories/jobRepo';

const t = initTRPC.context<Context>().create();

const JobSearchSchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  experienceLevel: z
    .enum(['entry', 'mid', 'senior', 'lead', 'executive'])
    .optional(),
  employmentType: z
    .enum(['full-time', 'part-time', 'contract', 'temporary', 'internship'])
    .optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const JobIdSchema = z.object({
  id: z.string(),
});

export const jobsRouter = t.router({
  search: t.procedure.input(JobSearchSchema).query(async ({ input }) => {
    return jobRepo.search(input);
  }),

  findById: t.procedure.input(JobIdSchema).query(async ({ input }) => {
    return jobRepo.findById(input.id);
  }),

  findByWorkableId: t.procedure.input(JobIdSchema).query(async ({ input }) => {
    return jobRepo.findByWorkableId(input.id);
  }),

  findActive: t.procedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return jobRepo.findActive(input.limit);
    }),
});
