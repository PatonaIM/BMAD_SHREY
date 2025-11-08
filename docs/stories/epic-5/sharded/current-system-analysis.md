# 📊 Current System Analysis

## Existing Timeline Implementation

**Location**: `src/components/recruiter/timeline/TimelineView.tsx`

**Current Features**:

- ✅ Event-based timeline (status changes, actions, notes)
- ✅ Date grouping with relative timestamps
- ✅ Role-based filtering (candidate vs recruiter events)
- ✅ Event icons and visual hierarchy
- ✅ Refresh functionality

**Limitations**:

- ❌ **Linear progression**: No support for dynamic stage insertion
- ❌ **Single-state model**: Cannot represent stage sub-states (before/after)
- ❌ **No action embedding**: Actions live outside timeline (separate components)
- ❌ **Fixed stage sequence**: Cannot reorder or skip stages
- ❌ **No multiplicity**: Cannot create multiple instances of same stage type

## Current Data Models

**ApplicationStatus** (src/shared/types/application.ts):

```typescript
type ApplicationStatus =
  | 'submitted'
  | 'ai_interview'
  | 'under_review'
  | 'interview_scheduled'
  | 'offer'
  | 'rejected';
```

**Limitation**: Single status field cannot represent:

- Multiple assignments at different completion states
- Multiple live interviews at different scheduling states
- Stage-specific metadata (assignment docs, interview slots, feedback)

**ApplicationTimelineEvent**:

```typescript
interface ApplicationTimelineEvent {
  timestamp: Date;
  status: ApplicationStatus;
  note?: string;
  actorType: 'system' | 'recruiter' | 'candidate';
  actorId?: string;
}
```

**Limitation**: Events are append-only audit logs, not mutable stage containers

---
