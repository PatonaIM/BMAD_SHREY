# 12. Quick Reference

## Common Commands

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

## Key Import Patterns

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

## File Naming Conventions

| Type          | Convention         | Example                    |
| ------------- | ------------------ | -------------------------- |
| **Component** | PascalCase.tsx     | `ApplicationCard.tsx`      |
| **Hook**      | camelCase.ts       | `useInlineAction.ts`       |
| **Utility**   | camelCase.ts       | `cn.ts`, `formatting.ts`   |
| **Type**      | PascalCase.ts      | `Application.ts`           |
| **Test**      | \*.test.tsx        | `ApplicationCard.test.tsx` |
| **Page**      | lowercase/page.tsx | `app/recruiter/page.tsx`   |

## Project-Specific Patterns

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
