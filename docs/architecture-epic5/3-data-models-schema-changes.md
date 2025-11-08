# 3. Data Models & Schema Changes

## Application Stage Model

```typescript
interface ApplicationStage {
  id: string; // UUID
  type: StageType;
  order: number; // 0-based ordering
  status: StageStatus;
  createdAt: Date;
  createdBy: { role: 'system' | 'recruiter'; id?: string };
  updatedAt: Date;
  data: StageData; // Polymorphic
  visibleTo: ('candidate' | 'recruiter')[];
  candidateActions?: CandidateAction[];
  recruiterActions?: RecruiterAction[];
}
```

## Stage Types & Statuses

```typescript
type StageType =
  | 'submit_application'
  | 'ai_interview'
  | 'assignment'
  | 'live_interview'
  | 'offer'
  | 'offer_accepted';

// Lifecycle progression varies per type
```

## Polymorphic Data Payloads

Key differences documented for query shaping & storage:

- `assignment`: focuses on document distribution & candidate submission + feedback.
- `live_interview`: links scheduledCalls & supports reschedule requests.
- `offer`: decision state & uploaded offer letter.
- `offer_accepted`: onboarding documents array.

## Extended Application Schema

```typescript
interface Application {
  // legacy fields ...
  status?: ApplicationStatus; // retained temporarily
  stages: ApplicationStage[];
  currentStageId: string;
  isDisqualified: boolean;
  disqualificationReason?: string;
  journeyCompletedAt?: Date;
}
```

## Derived Data

We avoid storing redundant projections (e.g. stage counts). Compute on read to reduce consistency burdens. Cached at service layer if p95 latency warrants.

## Index Strategy

```typescript
// Compound ordering + status filtering
// Allows queries: active stage lookup, recruiter dashboards, analytics
// Use partial indexes where appropriate for disqualified filtering

db.applications.createIndex({ 'stages.type': 1, 'stages.status': 1 });
db.applications.createIndex({ 'stages.order': 1 });
db.applications.createIndex({ currentStageId: 1 });
// Migration-era safety: maintain existing timeline index for audits
```

## Invariants

| Invariant                                                               | Enforcement Layer                   |
| ----------------------------------------------------------------------- | ----------------------------------- |
| submit_application is first                                             | Migration + StageService on reorder |
| offer / offer_accepted last (if present)                                | StageService validation             |
| Max 3 assignments & live_interviews                                     | StageService creation guard         |
| Exactly one currentStageId points to status not in {completed, skipped} | Transition function                 |
| Disqualification locks further creation                                 | Pre-check at stage insertion        |

## Migration Transformation Logic (Pseudo)

```typescript
function migrate(application: LegacyApplication): NewApplication {
  const stages: ApplicationStage[] = [];
  // 1. Always synthesize submit_application from initial status
  stages.push(makeSubmitStage(application));
  // 2. Map known statuses to stage entries (preserving timestamps via createdAt approximation)
  // 3. Derive currentStageId from latest non-terminal status
  // 4. Populate visibility arrays (candidate sees completed + current + teaser next)
  return {
    ...application,
    stages,
    currentStageId: deriveCurrent(stages),
    status: application.status, // kept for shadow
  };
}
```

## Data Growth & Storage Considerations

- Stage array size bounded (≈ <15 typical, <10 MVP).
- Feedback blobs kept small (rating + textual comments). Large artifacts (documents) offloaded to Azure Storage.
- Avoid document bloat by not embedding scheduling slot arrays—link via `scheduledCalls`.

## Backward Compatibility Window

Legacy consumers reading `status` continue functioning until flag retirement. All new code paths pivot to stage-based reading after migration + initial validation.

## Future Extensibility Hooks

| Future Need                | Prepared Mechanism                                   |
| -------------------------- | ---------------------------------------------------- |
| Workflow templates         | Add `workflowTemplateId` at Application root         |
| Automation rules           | Introduce `autoProgressRules[]` separate collection  |
| Multi-interviewer feedback | Expand `feedback` to an array with attribution       |
| AI predictions             | Add `stagePrediction` sub-doc with confidence scores |
