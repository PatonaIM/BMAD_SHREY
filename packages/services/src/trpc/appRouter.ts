import { initTRPC } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const healthRouter = t.router({
  ping: t.procedure.query(() => ({ ok: true, ts: Date.now() })),
});

export const appRouter = t.router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
