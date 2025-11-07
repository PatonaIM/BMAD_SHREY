# 7. API Integration

## tRPC Client Configuration

```typescript
// lib/api.ts (existing, no changes needed)
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCReact<AppRouter>();
```

## Service Layer for Complex Logic

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
