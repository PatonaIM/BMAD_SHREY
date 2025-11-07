# 4. Inline-First Design Patterns

## Pattern 1: Inline Expansion (70% Modal Reduction)

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

## Pattern 2: Bottom Sheet (Mobile Alternative to Modals)

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

## Pattern 3: Optimistic Actions with Visual Feedback

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
