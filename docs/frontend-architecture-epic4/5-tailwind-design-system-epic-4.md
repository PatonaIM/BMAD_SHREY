# 5. Tailwind Design System (Epic 4)

## Color Palette

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

## Custom Utility Classes

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

## Responsive Breakpoints

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
