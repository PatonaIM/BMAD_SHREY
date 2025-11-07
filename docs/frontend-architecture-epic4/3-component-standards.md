# 3. Component Standards

## Component Template (Epic 4 Pattern)

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

## Naming Conventions

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
