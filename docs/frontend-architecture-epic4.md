# Epic 4 Frontend Architecture: Inline-First Recruiter Tools

**Date**: 2025-11-07  
**Version**: 1.0  
**Author**: Winston (Architect)  
**Status**: Ready for Implementation

---

## 1. Frontend Tech Stack

### Core Technologies

| Category             | Technology               | Version     | Purpose                         | Rationale                                                                     |
| -------------------- | ------------------------ | ----------- | ------------------------------- | ----------------------------------------------------------------------------- |
| **Framework**        | Next.js                  | 15.0.0      | React framework with App Router | SSR, file-based routing, API routes, optimal performance                      |
| **Language**         | TypeScript               | 5.3.3       | Type-safe development           | Catch errors early, better IDE support, self-documenting code                 |
| **Styling**          | Tailwind CSS             | 3.4+        | Utility-first CSS framework     | Rapid development, consistent design, mobile-first, dark mode support         |
| **UI Primitives**    | Headless UI              | 1.7+        | Unstyled accessible components  | Accessibility built-in, full styling control with Tailwind                    |
| **State Management** | TanStack Query           | 4.36+       | Server state management         | Optimistic updates, automatic refetching, caching, perfect for inline actions |
| **Form Handling**    | React Hook Form          | 7.48+       | Performant form management      | Minimal re-renders, validation, works well with inline forms                  |
| **Validation**       | Zod                      | 3.22+       | Schema validation               | Type-safe, reuse tRPC schemas, client-side validation                         |
| **Animation**        | Framer Motion            | 10.16+      | React animation library         | Smooth transitions for inline expansions, bottom sheets, micro-interactions   |
| **Icons**            | Lucide React             | 0.292+      | Icon library                    | Tree-shakeable, consistent design, extensive collection                       |
| **Testing**          | Vitest + Testing Library | 1.0+, 14.0+ | Unit/integration testing        | Fast, compatible with Next.js, React-focused testing utilities                |
| **E2E Testing**      | Playwright               | 1.40+       | End-to-end testing              | Cross-browser, reliable, network mocking                                      |

### Tailwind Plugins

```javascript
// tailwind.config.js (extensions for Epic 4)
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'), // NEW - for inline card responsive breakpoints
  ],
};
```

---

## 2. Project Structure (Epic 4 Additions)

```
src/
├── app/
│   ├── recruiter/                           # NEW - Recruiter pages
│   │   ├── page.tsx                         # Dashboard landing
│   │   ├── layout.tsx                       # Recruiter-specific layout
│   │   ├── jobs/
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 # Job-specific dashboard
│   │   │       └── candidates/
│   │   │           └── [candidateId]/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                     # Settings overview
│   │       ├── integrations/page.tsx        # Google Chat/Calendar setup
│   │       └── availability/page.tsx        # Scheduling preferences
│   └── applications/
│       └── [id]/
│           └── timeline/page.tsx            # NEW - Candidate timeline view
│
├── components/
│   ├── recruiter/                           # NEW - Recruiter components
│   │   ├── dashboard/
│   │   │   ├── RecruiterDashboard.tsx       # Main dashboard container
│   │   │   ├── MetricsCard.tsx              # KPI cards (applications, scores, etc.)
│   │   │   ├── RecentActivity.tsx           # Activity feed
│   │   │   └── QuickActions.tsx             # Dashboard quick actions
│   │   ├── applications/
│   │   │   ├── ApplicationCard.tsx          # Inline expandable card
│   │   │   ├── ApplicationGrid.tsx          # Grid layout with filters
│   │   │   ├── InlineActions.tsx            # Quick action toolbar
│   │   │   ├── DetailPanel.tsx              # Expanded application details
│   │   │   └── BulkActions.tsx              # Multi-select actions
│   │   ├── timeline/
│   │   │   ├── TimelineView.tsx             # Dual-perspective timeline
│   │   │   ├── TimelineEvent.tsx            # Individual event card
│   │   │   ├── TimelineFilters.tsx          # Filter by event type/date
│   │   │   └── TimelineGrouping.tsx         # Group by day/week
│   │   ├── scheduling/
│   │   │   ├── SchedulingPanel.tsx          # Availability calendar
│   │   │   ├── AvailabilityGrid.tsx         # Time slot grid
│   │   │   ├── CallScheduler.tsx            # Book call dialog
│   │   │   └── UpcomingCalls.tsx            # Call list widget
│   │   ├── feedback/
│   │   │   ├── FeedbackForm.tsx             # Inline feedback entry
│   │   │   ├── QuickRating.tsx              # Star rating component
│   │   │   ├── FeedbackHistory.tsx          # Past feedback list
│   │   │   └── TagSelector.tsx              # Feedback tags
│   │   ├── suggestions/
│   │   │   ├── CandidateSuggestions.tsx     # AI-powered suggestions
│   │   │   ├── SuggestionCard.tsx           # Individual suggestion
│   │   │   └── SuggestionFilters.tsx        # Filter criteria
│   │   ├── integrations/
│   │   │   ├── GoogleChatSetup.tsx          # Chat webhook config
│   │   │   ├── GoogleCalendarConnect.tsx    # OAuth flow
│   │   │   └── IntegrationStatus.tsx        # Connection status badges
│   │   └── sharing/
│   │       ├── ProfileShareDialog.tsx       # Share link generator
│   │       ├── ShareableLink.tsx            # Generated link display
│   │       └── ShareHistory.tsx             # Share activity log
│   │
│   ├── candidate/
│   │   └── timeline/
│   │       ├── CandidateTimeline.tsx        # NEW - Candidate view
│   │       └── TimelineEventCard.tsx        # Event card (filtered)
│   │
│   └── ui/                                  # Shared UI primitives
│       ├── BottomSheet.tsx                  # NEW - Mobile action sheet
│       ├── InlineExpander.tsx               # NEW - Collapsible container
│       ├── OptimisticLoader.tsx             # NEW - Loading states for optimistic updates
│       ├── Badge.tsx                        # Status badges
│       ├── Button.tsx                       # Button variants
│       ├── Card.tsx                         # Card wrapper
│       ├── Dialog.tsx                       # Modal (minimal usage per UX)
│       ├── Dropdown.tsx                     # Dropdown menu
│       ├── Input.tsx                        # Form input
│       ├── Select.tsx                       # Select dropdown
│       ├── Tabs.tsx                         # Tab navigation
│       └── Toast.tsx                        # Toast notifications
│
├── hooks/
│   ├── recruiter/                           # NEW - Recruiter hooks
│   │   ├── useInlineAction.ts               # Optimistic update hook
│   │   ├── useApplications.ts               # Application data fetching
│   │   ├── useTimeline.ts                   # Timeline data + filters
│   │   ├── useScheduling.ts                 # Availability + booking
│   │   └── useSuggestions.ts                # AI candidate suggestions
│   ├── useMediaQuery.ts                     # Responsive breakpoint detection
│   ├── useBottomSheet.ts                    # Bottom sheet state management
│   └── useOptimisticUpdate.ts               # Generic optimistic update hook
│
├── lib/
│   ├── utils/
│   │   ├── cn.ts                            # Tailwind class merger (clsx + twMerge)
│   │   ├── formatting.ts                    # Date, number, text formatting
│   │   └── timeline.ts                      # NEW - Timeline grouping/filtering logic
│   └── constants/
│       └── recruiter.ts                     # NEW - Recruiter-specific constants
│
└── styles/
    └── globals.css                          # Global Tailwind + custom utilities
```

---

## 3. Component Standards

### Component Template (Epic 4 Pattern)

```typescript
// components/recruiter/applications/ApplicationCard.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Star, Calendar, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { InlineActions } from './InlineActions';
import { DetailPanel } from './DetailPanel';
import type { Application } from '@/types/application';

interface ApplicationCardProps {
  application: Application;
  onAction?: (action: string, applicationId: string) => void;
  className?: string;
}

export function ApplicationCard({
  application,
  onAction,
  className
}: ApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={cn(
        'relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
        'rounded-lg transition-shadow hover:shadow-md',
        isExpanded && 'shadow-lg ring-2 ring-brand-primary/20',
        className
      )}
    >
      {/* Collapsed View */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {application.candidateName}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
              {application.jobTitle}
            </p>
          </div>

          {/* Score Badge */}
          <div className={cn(
            'flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
            application.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            application.score >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
            'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
          )}>
            {application.score}/100
          </div>
        </div>

        {/* Inline Actions */}
        <InlineActions
          applicationId={application.id}
          actions={['feedback', 'schedule', 'share', 'expand']}
          onAction={(action) => {
            if (action === 'expand') {
              setIsExpanded(!isExpanded);
            } else {
              onAction?.(action, application.id);
            }
          }}
          isExpanded={isExpanded}
        />
      </div>

      {/* Expanded Detail Panel (Inline) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-neutral-200 dark:border-neutral-800">
              <DetailPanel application={application} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
```

### Naming Conventions

| Element              | Convention                  | Example                                         |
| -------------------- | --------------------------- | ----------------------------------------------- |
| **Components**       | PascalCase                  | `ApplicationCard.tsx`, `InlineActions.tsx`      |
| **Props Interface**  | `ComponentName + Props`     | `ApplicationCardProps`                          |
| **Hooks**            | camelCase with `use` prefix | `useInlineAction.ts`, `useTimeline.ts`          |
| **Utilities**        | camelCase                   | `cn.ts`, `formatDate.ts`                        |
| **Constants**        | UPPER_SNAKE_CASE            | `MAX_APPLICATIONS_PER_PAGE`                     |
| **Types/Interfaces** | PascalCase                  | `Application`, `TimelineEvent`                  |
| **CSS Classes**      | Tailwind utilities only     | `px-4 py-3 bg-white`                            |
| **Files**            | Match export name           | `ApplicationCard.tsx` exports `ApplicationCard` |

---

## 4. Inline-First Design Patterns

### Pattern 1: Inline Expansion (70% Modal Reduction)

**Goal**: Avoid modals, expand content inline within cards.

```typescript
// components/ui/InlineExpander.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface InlineExpanderProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function InlineExpander({
  trigger,
  children,
  isExpanded,
  onToggle,
  className,
}: InlineExpanderProps) {
  return (
    <div className={cn('border-t border-neutral-200 dark:border-neutral-800', className)}>
      {/* Trigger Button */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'text-sm font-medium text-neutral-700 dark:text-neutral-300',
          'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
        )}
        aria-expanded={isExpanded}
      >
        {trigger}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-300',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Usage
<InlineExpander
  trigger="View Candidate Details"
  isExpanded={isExpanded}
  onToggle={() => setIsExpanded(!isExpanded)}
>
  <CandidateProfile application={application} />
</InlineExpander>
```

### Pattern 2: Bottom Sheet (Mobile Alternative to Modals)

**Goal**: Mobile-first design for actions that require focus.

```typescript
// components/ui/BottomSheet.tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 md:hidden',
              'bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl',
              'max-h-[90vh] overflow-y-auto',
              className
            )}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Usage
<BottomSheet
  isOpen={isSchedulingOpen}
  onClose={() => setIsSchedulingOpen(false)}
  title="Schedule Call"
>
  <CallScheduler applicationId={application.id} />
</BottomSheet>
```

### Pattern 3: Optimistic Actions with Visual Feedback

**Goal**: Instant UI updates before server confirmation (40% faster task completion).

```typescript
// hooks/useInlineAction.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Application } from '@/types/application';

interface InlineActionOptions<T> {
  mutationFn: (data: T) => Promise<void>;
  queryKey: string[];
  optimisticUpdate: (old: Application[], data: T) => Application[];
  successMessage?: string;
  errorMessage?: string;
}

export function useInlineAction<T>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  successMessage = 'Action completed',
  errorMessage = 'Action failed. Please try again.',
}: InlineActionOptions<T>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (data: T) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous state
      const previousData = queryClient.getQueryData<Application[]>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<Application[]>(queryKey, (old = []) =>
        optimisticUpdate(old, data)
      );

      return { previousData };
    },
    onError: (error, data, context) => {
      // Rollback on failure
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage);
      console.error('Inline action failed:', error);
    },
    onSuccess: () => {
      toast.success(successMessage);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage in InlineActions component
const addFeedbackMutation = useInlineAction({
  mutationFn: (data: {
    applicationId: string;
    rating: number;
    notes: string;
  }) => api.recruiter.addFeedback.mutate(data),
  queryKey: ['applications'],
  optimisticUpdate: (applications, data) =>
    applications.map(app =>
      app.id === data.applicationId
        ? { ...app, feedbackCount: (app.feedbackCount || 0) + 1 }
        : app
    ),
  successMessage: 'Feedback added',
  errorMessage: 'Failed to add feedback',
});

const handleQuickFeedback = (rating: number) => {
  addFeedbackMutation.mutate({
    applicationId: application.id,
    rating,
    notes: '',
  });
};
```

---

## 5. Tailwind Design System (Epic 4)

### Color Palette

```css
/* globals.css - Extended for Epic 4 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Existing Brand Colors */
    --brand-primary: #a16ae8; /* Purple */
    --brand-secondary: #8096fd; /* Blue */

    /* Semantic Colors for Epic 4 */
    --color-success: #10b981; /* Green-500 */
    --color-success-light: #d1fae5; /* Green-100 */
    --color-warning: #f59e0b; /* Amber-500 */
    --color-warning-light: #fef3c7; /* Amber-100 */
    --color-danger: #ef4444; /* Red-500 */
    --color-danger-light: #fee2e2; /* Red-100 */
    --color-info: #3b82f6; /* Blue-500 */
    --color-info-light: #dbeafe; /* Blue-100 */

    /* Score Ranges */
    --score-high: var(--color-success);
    --score-medium: var(--color-info);
    --score-low: var(--color-warning);
  }

  .dark {
    --color-success-light: rgba(16, 185, 129, 0.2);
    --color-warning-light: rgba(245, 158, 11, 0.2);
    --color-danger-light: rgba(239, 68, 68, 0.2);
    --color-info-light: rgba(59, 130, 246, 0.2);
  }
}
```

### Custom Utility Classes

```css
@layer components {
  /* Button Variants */
  .btn-primary {
    @apply bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-lg transition-colors;
  }

  .btn-outline {
    @apply border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/10 font-medium rounded-lg transition-colors;
  }

  .btn-ghost {
    @apply text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium rounded-lg transition-colors;
  }

  /* Card Variants */
  .card {
    @apply bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm;
  }

  .card-hover {
    @apply card hover:shadow-md hover:border-brand-primary/30 transition-all;
  }

  .card-interactive {
    @apply card-hover cursor-pointer active:scale-[0.98] transition-transform;
  }

  /* Score Badges */
  .badge-score-high {
    @apply bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700;
  }

  .badge-score-medium {
    @apply bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700;
  }

  .badge-score-low {
    @apply bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700;
  }

  /* Inline Action Toolbar */
  .inline-actions {
    @apply flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg;
  }

  .inline-action-btn {
    @apply p-2 rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors;
  }

  /* Timeline Events */
  .timeline-event {
    @apply relative pl-8 pb-6 border-l-2 border-neutral-200 dark:border-neutral-800;
  }

  .timeline-event::before {
    @apply content-[''] absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-brand-primary border-4 border-white dark:border-neutral-900;
  }

  /* Bottom Sheet Handle */
  .bottom-sheet-handle {
    @apply w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto my-3;
  }
}
```

### Responsive Breakpoints

```typescript
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Predefined breakpoints
export const useBreakpoints = () => ({
  isMobile: useMediaQuery('(max-width: 640px)'),
  isTablet: useMediaQuery('(min-width: 641px) and (max-width: 1024px)'),
  isDesktop: useMediaQuery('(min-width: 1025px)'),
});

// Usage
const { isMobile } = useBreakpoints();

// Show bottom sheet on mobile, inline expansion on desktop
{isMobile ? (
  <BottomSheet isOpen={isOpen} onClose={onClose}>
    <FeedbackForm />
  </BottomSheet>
) : (
  <InlineExpander isExpanded={isOpen} onToggle={onToggle}>
    <FeedbackForm />
  </InlineExpander>
)}
```

---

## 6. State Management Patterns

### TanStack Query Setup

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

### Epic 4 Query Hooks

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

## 7. API Integration

### tRPC Client Configuration

```typescript
// lib/api.ts (existing, no changes needed)
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCReact<AppRouter>();
```

### Service Layer for Complex Logic

```typescript
// lib/services/timelineService.ts
import type { TimelineEvent } from '@/types/timeline';

export class TimelineService {
  /**
   * Group timeline events by date
   */
  static groupByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
    const grouped = new Map<string, TimelineEvent[]>();

    events.forEach(event => {
      const dateKey = new Date(event.timestamp).toISOString().split('T')[0];
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, event]);
    });

    return grouped;
  }

  /**
   * Filter events by type
   */
  static filterByType(
    events: TimelineEvent[],
    types: string[]
  ): TimelineEvent[] {
    if (types.length === 0) return events;
    return events.filter(event => types.includes(event.eventType));
  }

  /**
   * Get relative time label (e.g., "2 hours ago")
   */
  static getRelativeTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
```

---

## 8. Accessibility Standards

### ARIA Labels & Semantic HTML

```typescript
// Example: Accessible ApplicationCard
<article
  role="article"
  aria-labelledby={`application-${application.id}`}
  className="card"
>
  <h3 id={`application-${application.id}`} className="text-lg font-semibold">
    {application.candidateName}
  </h3>

  <button
    onClick={handleExpand}
    aria-expanded={isExpanded}
    aria-controls={`details-${application.id}`}
    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${application.candidateName}`}
  >
    <ChevronDown />
  </button>

  {isExpanded && (
    <div id={`details-${application.id}`} role="region">
      <DetailPanel application={application} />
    </div>
  )}
</article>
```

### Keyboard Navigation

```typescript
// components/recruiter/applications/InlineActions.tsx
export function InlineActions({ actions, onAction }: InlineActionsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, action: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAction(action);
    }
  };

  return (
    <div className="inline-actions" role="toolbar" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          onKeyDown={(e) => handleKeyDown(e, action)}
          className="inline-action-btn"
          aria-label={`${action} action`}
        >
          <ActionIcon action={action} />
        </button>
      ))}
    </div>
  );
}
```

### Focus Management

```typescript
// hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    firstElement?.focus();
    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
}

// Usage in BottomSheet
const containerRef = useFocusTrap(isOpen);

<div ref={containerRef} className="bottom-sheet">
  {children}
</div>
```

---

## 9. Testing Strategy

### MVP Approach: Manual Testing

**Decision**: Automated tests deferred to post-MVP to accelerate delivery and validate core functionality first.

### Manual Testing Checklist

#### Component Testing (Browser DevTools)

**1. ApplicationCard**

- [ ] Renders candidate name, job title, score badge
- [ ] Score badge color correct (green ≥80, blue ≥60, amber <60)
- [ ] Inline actions toolbar displays all action buttons
- [ ] Expand/collapse animation smooth (300ms duration)
- [ ] Detail panel shows full application info when expanded
- [ ] Dark mode: All text readable, borders visible

**2. InlineActions**

- [ ] All action buttons clickable (feedback, schedule, share, expand)
- [ ] Hover states work correctly
- [ ] Icons display correctly (Star, Calendar, Share2, ChevronDown)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Mobile: Touch targets ≥44px

**3. TimelineView**

- [ ] Events display in chronological order (newest first)
- [ ] Role-based filtering works (candidate sees only candidate+both events)
- [ ] Event icons match event type
- [ ] Relative time labels accurate ("2h ago", "Yesterday")
- [ ] Grouping by date works correctly

**4. BottomSheet (Mobile)**

- [ ] Slides up smoothly from bottom on open
- [ ] Backdrop dims background
- [ ] Swipe-to-close gesture works
- [ ] Close button functional
- [ ] Focus trap works (Tab loops within sheet)
- [ ] Body scroll locked when open

**5. SchedulingPanel**

- [ ] Availability grid renders correctly
- [ ] Time slots selectable
- [ ] Booked slots disabled/grayed out
- [ ] Selected slot highlights
- [ ] Confirmation flow works

#### Interaction Testing

**Optimistic Updates**

- [ ] Quick feedback: UI updates before server response
- [ ] Loading spinner does NOT show during optimistic update
- [ ] Rollback occurs on server error with toast notification
- [ ] Final state matches server after refetch

**Responsive Behavior**

- [ ] Desktop (≥1024px): Inline expansion used
- [ ] Mobile (<640px): Bottom sheet used
- [ ] Tablet (641-1024px): Context-appropriate UI
- [ ] No horizontal scroll at any breakpoint

**Accessibility**

- [ ] All interactive elements have aria-labels
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces actions (test with VoiceOver/NVDA)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA (use axe DevTools)

#### Browser/Device Testing

**Desktop Browsers**

- [ ] Chrome (latest)
- [ ] Safari (macOS)
- [ ] Firefox (latest)
- [ ] Edge (latest)

**Mobile Devices**

- [ ] iPhone SE (375px) - Chrome/Safari
- [ ] iPhone 14 Pro - Safari
- [ ] Samsung Galaxy S21 - Chrome
- [ ] iPad Pro - Safari

**Dark Mode**

- [ ] Toggle light/dark in system settings
- [ ] All components render correctly in both modes
- [ ] No white flashes during transition
- [ ] Tailwind dark: classes working

### Post-MVP Testing Plan

Once MVP validated through manual testing, implement automated tests in this order:

**Phase 1: Unit Tests (Week 1 post-MVP)**

```typescript
// Priority components
- useInlineAction hook (optimistic updates critical)
- TimelineService (filtering logic)
- cn utility (class merging)
- Formatting utilities (dates, numbers)
```

**Phase 2: Integration Tests (Week 2 post-MVP)**

```typescript
// Component integration
- ApplicationCard with API mocks
- TimelineView with role filtering
- SchedulingPanel with booking flow
```

**Phase 3: E2E Tests (Week 3 post-MVP)**

```typescript
// Critical user flows (Playwright)
- Recruiter dashboard → view application → add feedback
- Recruiter dashboard → schedule call → confirm booking
- Candidate timeline → view events → verify filtering
```

**Coverage Target**: 80% code coverage for critical paths only (not 100%)

### Testing Tools (Install when ready)

```bash
# Post-MVP installation
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D @axe-core/playwright  # Accessibility testing
```

---

## 10. Performance Optimization

### Code Splitting

```typescript
// app/recruiter/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const CandidateSuggestions = dynamic(
  () => import('@/components/recruiter/suggestions/CandidateSuggestions'),
  { loading: () => <SuggestionsSkeleton /> }
);

const TimelineView = dynamic(
  () => import('@/components/recruiter/timeline/TimelineView'),
  { loading: () => <TimelineSkeleton /> }
);
```

### Image Optimization

```typescript
// components/recruiter/applications/CandidateAvatar.tsx
import Image from 'next/image';

export function CandidateAvatar({ src, name }: { src?: string; name: string }) {
  return (
    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
      {src ? (
        <Image
          src={src}
          alt={`${name}'s profile picture`}
          fill
          sizes="40px"
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
```

### Virtualized Lists (for 100+ applications)

```typescript
// components/recruiter/applications/ApplicationGrid.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function ApplicationGrid({ applications }: { applications: Application[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: applications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated card height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ApplicationCard application={applications[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 11. Critical Coding Rules

### Epic 4 Frontend Standards

1. **Always Use Optimistic Updates for Inline Actions**
   - Never show loading spinners for quick actions (feedback, ratings, status changes)
   - Implement rollback on error with toast notification
   - Example: `useInlineAction` hook mandatory for all mutation actions

2. **Mobile-First Responsive Design**
   - Test every component at 375px width (iPhone SE)
   - Use bottom sheets for mobile, inline expansion for desktop
   - Leverage `useBreakpoints` hook for conditional rendering

3. **Avoid Modals Unless Absolutely Necessary**
   - Per UX specs: 70% modal reduction goal
   - Use inline expansion (`InlineExpander`) by default
   - Modals only for: confirmations, critical errors, multi-step wizards

4. **Dark Mode Support Mandatory**
   - Every component must work in both light/dark modes
   - Use `dark:` prefix for dark mode variants
   - Test with system preference toggle

5. **Accessibility is Non-Negotiable**
   - All interactive elements need `aria-label` or `aria-labelledby`
   - Keyboard navigation must work (Tab, Enter, Escape)
   - Screen reader test with VoiceOver (Mac) or NVDA (Windows)

6. **TypeScript Strict Mode**
   - No `any` types allowed (use `unknown` if truly unknown)
   - Props interfaces required for all components
   - API responses must have typed interfaces

7. **Framer Motion for All Animations**
   - Consistent animation timing: `duration: 0.3, ease: 'easeInOut'`
   - Use `AnimatePresence` for enter/exit animations
   - Respect `prefers-reduced-motion` setting

8. **Tailwind Class Organization**
   - Use `cn()` utility for conditional classes (never raw template strings)
   - Order: layout → spacing → colors → typography → effects
   - Extract repeated patterns to `@layer components` in globals.css

9. **Error Boundaries for Resilience**

   ```typescript
   // Wrap all main sections
   <ErrorBoundary fallback={<ErrorFallback />}>
     <RecruiterDashboard />
   </ErrorBoundary>
   ```

10. **Performance Budget**
    - First Contentful Paint < 1.5s
    - Time to Interactive < 3s
    - Lighthouse Performance score > 90
    - Use `next/dynamic` for components > 50KB

---

## 12. Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:watch       # Watch mode
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript compiler check
npm run format           # Prettier formatting

# Specific to Epic 4
npm run test:recruiter   # Run only recruiter component tests
npm run storybook        # Launch Storybook (if using)
```

### Key Import Patterns

```typescript
// Components
import { ApplicationCard } from '@/components/recruiter/applications/ApplicationCard';
import { Button } from '@/components/ui/Button';

// Hooks
import { useInlineAction } from '@/hooks/useInlineAction';
import { useApplications } from '@/hooks/recruiter/useApplications';

// Utils
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatting';

// Types
import type { Application } from '@/types/application';
import type { TimelineEvent } from '@/types/timeline';

// API
import { api } from '@/lib/api';

// Icons
import { Star, Calendar, Share2 } from 'lucide-react';

// Animation
import { motion, AnimatePresence } from 'framer-motion';
```

### File Naming Conventions

| Type          | Convention         | Example                    |
| ------------- | ------------------ | -------------------------- |
| **Component** | PascalCase.tsx     | `ApplicationCard.tsx`      |
| **Hook**      | camelCase.ts       | `useInlineAction.ts`       |
| **Utility**   | camelCase.ts       | `cn.ts`, `formatting.ts`   |
| **Type**      | PascalCase.ts      | `Application.ts`           |
| **Test**      | \*.test.tsx        | `ApplicationCard.test.tsx` |
| **Page**      | lowercase/page.tsx | `app/recruiter/page.tsx`   |

### Project-Specific Patterns

```typescript
// 1. Utility class merger
import { cn } from '@/lib/utils/cn';
const classes = cn('base-class', condition && 'conditional-class', className);

// 2. Optimistic mutation
const mutation = useInlineAction({
  mutationFn: api.recruiter.action.mutate,
  queryKey: ['key'],
  optimisticUpdate: (old, data) => updateLogic(old, data),
});

// 3. Responsive component rendering
const { isMobile } = useBreakpoints();
return isMobile ? <BottomSheet /> : <InlineExpander />;

// 4. Score badge variant
const scoreVariant =
  score >= 80 ? 'badge-score-high' :
  score >= 60 ? 'badge-score-medium' :
  'badge-score-low';

// 5. Timeline grouping
const grouped = TimelineService.groupByDate(events);
```

---

## 13. Environment Configuration

### Required Environment Variables

```env
# API (inherited from main architecture)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Feature Flags for Epic 4
NEXT_PUBLIC_ENABLE_RECRUITER_DASHBOARD=true
NEXT_PUBLIC_ENABLE_INLINE_ACTIONS=true
NEXT_PUBLIC_ENABLE_BOTTOM_SHEETS=true

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Development
NODE_ENV=development
```

---

## 14. Migration from Material-UI (If Applicable)

If your project previously used Material-UI and is migrating to Tailwind for Epic 4:

### Component Mapping

| Material-UI                    | Tailwind Equivalent                                 |
| ------------------------------ | --------------------------------------------------- |
| `<Box>`                        | `<div className="...">`                             |
| `<Stack>`                      | `<div className="flex flex-col gap-4">`             |
| `<Grid>`                       | `<div className="grid grid-cols-12 gap-4">`         |
| `<Card>`                       | `<div className="card">` (custom utility)           |
| `<Button variant="contained">` | `<button className="btn-primary">`                  |
| `<Button variant="outlined">`  | `<button className="btn-outline">`                  |
| `<Typography variant="h3">`    | `<h3 className="text-2xl font-bold">`               |
| `<Chip>`                       | `<span className="px-2 py-1 rounded-full text-xs">` |

### Theme Migration

```typescript
// Before (Material-UI)
const theme = {
  palette: {
    primary: { main: '#A16AE8' },
    secondary: { main: '#8096FD' },
  },
};

// After (Tailwind)
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#A16AE8',
        secondary: '#8096FD',
      },
    },
  },
}

// Usage
<div className="bg-brand-primary text-white">...</div>
```

---

## 15. Next Steps

### Week 1: Setup & Foundation

1. **Install Dependencies**

   ```bash
   npm install @headlessui/react framer-motion lucide-react clsx tailwind-merge
   npm install -D @tailwindcss/container-queries
   ```

2. **Create Utility Functions**
   - `lib/utils/cn.ts` - Class name merger
   - `lib/utils/formatting.ts` - Date/number formatters
   - `hooks/useMediaQuery.ts` - Responsive hooks

3. **Build UI Primitives**
   - `components/ui/BottomSheet.tsx`
   - `components/ui/InlineExpander.tsx`
   - `components/ui/OptimisticLoader.tsx`

4. **Manual Test**: Utilities work, UI primitives render correctly in light/dark mode

### Week 2-3: Core Components

- `ApplicationCard` with inline expansion
- `InlineActions` toolbar with optimistic updates
- `TimelineView` with role-based filtering
- `SchedulingPanel` with availability grid
- **Manual Test**: Use browser DevTools to verify each component (see Section 9 checklist)

### Week 4: Responsive & Polish

- Mobile bottom sheet implementations
- Cross-browser testing (Chrome, Safari, Firefox, Edge)
- Accessibility audit with browser DevTools (ARIA, keyboard nav)
- Performance check: Lighthouse score >90
- **Manual Test**: Test on real devices (iPhone, Android, iPad)

### Week 5: Deployment

- Production build testing (`npm run build`)
- Deploy to Vercel staging
- Full manual test pass (see Section 9 checklist)
- Monitor with Sentry
- **Post-MVP**: Begin automated test implementation (Phase 1: unit tests)

---

**Document Status**: Ready for implementation. Frontend architecture aligned with Epic 4 inline-first UX specifications and Tailwind CSS design system.

_Prepared by Winston (Architect) | 2025-11-07_
