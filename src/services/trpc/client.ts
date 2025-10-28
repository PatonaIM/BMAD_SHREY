import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './appRouter';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  // For server-side / edge execution fall back to NEXTAUTH_URL or localhost
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export function createTrpcClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  });
}
