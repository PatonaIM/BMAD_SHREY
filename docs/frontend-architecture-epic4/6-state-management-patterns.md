# 6. State Management Patterns

## TanStack Query Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Epic 4 Query Hooks

```typescript
// hooks/recruiter/useApplications.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application } from '@/types/application';

interface UseApplicationsOptions {
  jobId?: string;
  status?: string;
  minScore?: number;
}

export function useApplications(options: UseApplicationsOptions = {}) {
  return useQuery({
    queryKey: ['applications', options],
    queryFn: async () => {
      const result = await api.recruiter.getApplications.query(options);
      return result as Application[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// hooks/recruiter/useTimeline.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimelineEvent } from '@/types/timeline';

export function useTimeline(applicationId: string) {
  return useQuery({
    queryKey: ['timeline', applicationId],
    queryFn: async () => {
      const result = await api.recruiter.getTimeline.query({ applicationId });
      return result as TimelineEvent[];
    },
    enabled: !!applicationId,
  });
}

// hooks/recruiter/useSuggestions.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Suggestion } from '@/types/suggestion';

export function useSuggestions(jobId: string, limit = 10) {
  return useQuery({
    queryKey: ['suggestions', jobId, limit],
    queryFn: async () => {
      const result = await api.recruiter.getSuggestedCandidates.query({
        jobId,
        limit,
      });
      return result as Suggestion[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (AI suggestions don't change frequently)
  });
}
```

---
