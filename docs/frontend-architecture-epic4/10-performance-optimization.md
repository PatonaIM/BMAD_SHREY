# 10. Performance Optimization

## Code Splitting

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

## Image Optimization

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

## Virtualized Lists (for 100+ applications)

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
