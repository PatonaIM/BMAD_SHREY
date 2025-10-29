'use client';
import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTrpcClient } from '../services/trpc/client';

interface ProvidersProps {
  children: ReactNode;
  session: Session | null;
}

export default function Providers({
  children,
  session,
}: ProvidersProps): React.ReactElement {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
