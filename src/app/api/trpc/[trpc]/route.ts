import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@bmad/services/trpc/appRouter';
import { createContext } from '@bmad/services/trpc/context';

export const runtime = 'edge';

export const GET = (req: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(),
  });

export const POST = GET;
