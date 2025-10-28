'use client';
import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { trpc, createTrpcClient } from '../services/trpc/client';
import { theme } from '../theme';

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider session={session}>{children}</SessionProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  );
}
