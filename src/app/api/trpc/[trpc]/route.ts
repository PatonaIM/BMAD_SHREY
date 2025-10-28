import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../services/trpc/appRouter';
import { createContext } from '../../../../services/trpc/context';

// Use nodejs runtime because NextAuth + Mongo + crypto require Node APIs
export const runtime = 'nodejs';

export const GET = (req: Request): Promise<Response> =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
  });

export const POST = GET;
