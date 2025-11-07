# 8. Accessibility Standards

## ARIA Labels & Semantic HTML

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

## Keyboard Navigation

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

## Focus Management

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
