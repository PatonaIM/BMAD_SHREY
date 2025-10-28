import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';

export async function createContext(_opts?: CreateHTTPContextOptions) {
  // TODO: add auth/session, request ids, rate limit tokens
  return {};
}
export type Context = inferAsyncReturnType<typeof createContext>;
