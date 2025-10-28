import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { z } from 'zod';
import { computeMatchScore } from '../scoring/matchScorer';

const t = initTRPC.context<Context>().create();

const ScoreInputSchema = z.object({
  candidateSkills: z.array(z.string()),
  jobSkills: z.array(z.string()),
});

export const scoringRouter = t.router({
  score: t.procedure.input(ScoreInputSchema).query(({ input }) => {
    const result = computeMatchScore(input.candidateSkills, input.jobSkills);
    return result;
  }),
});
