import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { requireRole } from '../../auth/roleGuard';
import { scoringRouter } from './scoringRouter';
import { jobsRouter } from './jobsRouter';
import { performRegistration, RegistrationSchema } from '../auth/register';
import {
  PasswordResetRequestSchema,
  PasswordPerformSchema,
  requestPasswordReset,
  performPasswordReset,
} from '../auth/passwordReset';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape; // customize later
  },
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

const roleProtected = (roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    const rolesInSession = (ctx.session as unknown as { roles?: string[] })
      ?.roles;
    requireRole(roles, rolesInSession);
    return next({ ctx });
  });

export const healthRouter = t.router({
  ping: t.procedure.query(() => ({ ok: true, ts: Date.now() })),
});

export const authRouter = t.router({
  me: t.procedure.use(isAuthed).query(({ ctx }) => {
    const roles = (ctx.session as unknown as { roles?: string[] })?.roles || [];
    return { email: ctx.session?.user?.email, roles };
  }),
  adminCheck: t.procedure
    .use(roleProtected(['ADMIN']))
    .query(() => ({ ok: true })),
  register: t.procedure
    .input(RegistrationSchema)
    .mutation(async ({ input }) => {
      const res = await performRegistration(input);
      return res;
    }),
  passwordResetRequest: t.procedure
    .input(PasswordResetRequestSchema)
    .mutation(async ({ input, ctx }) => {
      return requestPasswordReset(input, { ip: ctx.ip });
    }),
  passwordResetPerform: t.procedure
    .input(PasswordPerformSchema)
    .mutation(async ({ input }) => {
      return performPasswordReset(input);
    }),
});

export const appRouter = t.router({
  health: healthRouter,
  auth: authRouter,
  scoring: scoringRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
