# Story 5.8: Disqualification & Journey Termination

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 3  
**Priority**: P0  
**Sprint**: Sprint 4 (Weeks 7-8)  
**Status**: Draft

---

## 📋 Story Overview

Allow recruiters to disqualify candidates at any stage with a reason. The application is marked as disqualified, the timeline shows the disqualification event, and no further stages can be created.

---

## 🎯 Acceptance Criteria

- ✅ Recruiter can disqualify application at any stage
- ✅ Disqualification requires reason (textarea, 500 chars max)
- ✅ Application marked as isDisqualified: true
- ✅ Candidate sees "Application Closed" message with optional feedback
- ✅ No further stages can be created after disqualification
- ✅ Timeline shows disqualification event
- ✅ Candidate receives notification

---

## 📦 Deliverables

### Backend Tasks

- [ ] **Task 1**: Disqualification Procedure
  - [ ] `recruiterRouter.disqualifyApplication`
    - Input: applicationId, reason, shareWithCandidate (boolean)
    - Update application: isDisqualified = true, disqualificationReason
    - Create disqualified stage (StageType = 'disqualified')
    - Create timeline event
    - Send notification to candidate (with/without reason based on shareWithCandidate)
    - Prevent further stage creation

- [ ] **Task 2**: Validation Logic
  - [ ] Add check to StageService.createStage: throw error if application.isDisqualified
  - [ ] Custom error: ApplicationDisqualifiedError

- [ ] **Task 3**: Write Backend Tests
  - [ ] Test: Disqualify application at various stages
  - [ ] Test: Cannot create stages after disqualification
  - [ ] Test: Reason shared/hidden based on shareWithCandidate flag
  - [ ] Test: Timeline event created
  - [ ] Test: Authorization check

### Frontend Tasks

- [ ] **Task 4**: Recruiter Components
  - [ ] `DisqualifyModal.tsx`
    - Reason textarea (required, 500 char max)
    - Checkbox: "Share reason with candidate"
    - Confirmation warning
    - Submit button calls `recruiterRouter.disqualifyApplication`

- [ ] **Task 5**: Candidate Components
  - [ ] `DisqualifiedStage.tsx`
    - "Application Closed" message
    - Show reason if shared by recruiter
    - No action buttons (terminal state)

- [ ] **Task 6**: Custom Hooks
  - [ ] `useDisqualify.ts` - disqualifyApplication function

- [ ] **Task 7**: Write Frontend Tests
  - [ ] Test: DisqualifyModal validation
  - [ ] Test: DisqualifiedStage displays reason if shared
  - [ ] Test: DisqualifiedStage hides reason if not shared

- [ ] **Task 8**: E2E Testing
  - [ ] E2E: Disqualify at assignment stage
  - [ ] E2E: Disqualify at interview stage
  - [ ] E2E: Verify no stages can be added after

---

## 🔗 Dependencies

None (can be done in parallel with other stories)

---

## 🏗️ Technical Implementation

### Disqualification Stage

```typescript
// Automatically created when recruiter disqualifies
{
  type: 'disqualified',
  title: 'Application Closed',
  status: 'completed',
  visibleToCandidate: true,
  data: {
    disqualifiedAt: Date,
    reason: string, // Only if shareWithCandidate = true
    disqualifiedBy: userId,
  }
}
```

### Backend: Disqualify Application

```typescript
recruiterRouter.disqualifyApplication: protectedProcedure
  .input(z.object({
    applicationId: z.string().uuid(),
    reason: z.string().min(10).max(500),
    shareWithCandidate: z.boolean().default(false),
  }))
  .mutation(async ({ input, ctx }) => {
    const { applicationId, reason, shareWithCandidate } = input;

    // 1. Authorization check
    const application = await applicationRepo.findById(applicationId);
    if (!application) throw new NotFoundError('Application not found');

    const job = await jobRepo.findById(application.jobId);
    if (job.recruiterId !== ctx.user.id) {
      throw new UnauthorizedError('Not authorized');
    }

    // 2. Update application
    await applicationRepo.update(applicationId, {
      isDisqualified: true,
      disqualificationReason: reason,
    });

    // 3. Create disqualified stage
    const stage = await stageService.createStage(applicationId, {
      type: 'disqualified',
      title: 'Application Closed',
      status: 'completed',
      visibleToCandidate: true,
      data: {
        disqualifiedAt: new Date(),
        reason: shareWithCandidate ? reason : null,
        disqualifiedBy: ctx.user.id,
      },
    }, ctx.user.id);

    // 4. Create timeline event
    await timelineService.logEvent({
      applicationId,
      eventType: 'application_disqualified',
      performedBy: ctx.user.id,
      metadata: { reason, shareWithCandidate },
    });

    // 5. Notify candidate
    await notificationService.send({
      userId: application.candidateId,
      type: 'application_disqualified',
      data: {
        applicationId,
        reason: shareWithCandidate ? reason : null,
      },
    });

    return { success: true, stage };
  })
```

### Validation in StageService

```typescript
// In StageService.createStage()
async createStage(applicationId: string, stageData: CreateStageInput, createdBy: string) {
  // 1. Check if application is disqualified
  const application = await applicationRepo.findById(applicationId);
  if (application.isDisqualified) {
    throw new ApplicationDisqualifiedError(
      'Cannot create stages for disqualified application'
    );
  }

  // ... rest of createStage logic
}
```

### Frontend: DisqualifiedStage

```tsx
export function DisqualifiedStage({ stage }: { stage: ApplicationStage }) {
  const data = stage.data as DisqualifiedData;

  return (
    <div className="disqualified-stage">
      <div className="flex items-center gap-3">
        <XCircleIcon className="w-12 h-12 text-red-500" />
        <h3 className="text-2xl font-bold text-red-600">Application Closed</h3>
      </div>

      <p className="mt-4 text-gray-700 dark:text-gray-300">
        We appreciate your interest and the time you invested in the application
        process. Unfortunately, we have decided not to move forward with your
        application at this time.
      </p>

      {data.reason && (
        <Alert variant="info" className="mt-4">
          <strong>Feedback:</strong>
          <p className="mt-2">{data.reason}</p>
        </Alert>
      )}

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Disqualified on {format(data.disqualifiedAt, 'PPP')}
      </p>
    </div>
  );
}
```

### Frontend: DisqualifyModal

```tsx
export function DisqualifyModal({ applicationId, isOpen, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [shareWithCandidate, setShareWithCandidate] = useState(false);
  const { disqualifyApplication, isLoading } = useDisqualify();

  const handleSubmit = async () => {
    try {
      await disqualifyApplication({
        applicationId,
        reason,
        shareWithCandidate,
      });
      toast.success('Application disqualified');
      onClose();
    } catch (error) {
      toast.error('Failed to disqualify application');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Disqualify Application</ModalHeader>

      <ModalBody>
        <Alert variant="warning">
          ⚠️ This action cannot be undone. The candidate will be notified and
          the application will be closed.
        </Alert>

        <Textarea
          label="Reason for Disqualification"
          value={reason}
          onChange={setReason}
          rows={5}
          maxLength={500}
          required
          placeholder="E.g., Skills do not match requirements, position filled, etc."
        />

        <Checkbox
          label="Share reason with candidate"
          checked={shareWithCandidate}
          onChange={setShareWithCandidate}
        />
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="error"
          onClick={handleSubmit}
          disabled={!reason || reason.length < 10 || isLoading}
          loading={isLoading}
        >
          Disqualify Application
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

---

## 🧪 Testing Strategy

### Backend Tests

```typescript
describe('recruiterRouter.disqualifyApplication', () => {
  it('disqualifies application successfully', async () => {
    const result = await caller.recruiter.disqualifyApplication({
      applicationId: 'app-123',
      reason: 'Skills do not match requirements',
      shareWithCandidate: true,
    });

    const application = await applicationRepo.findById('app-123');
    expect(application.isDisqualified).toBe(true);
    expect(application.disqualificationReason).toBe('Skills do not match requirements');
  });

  it('prevents stage creation after disqualification', async () => {
    await caller.recruiter.disqualifyApplication({ ... });

    await expect(
      caller.recruiter.giveAssignment({ applicationId: 'app-123', ... })
    ).rejects.toThrow('Cannot create stages for disqualified application');
  });

  it('creates disqualified stage', async () => {
    await caller.recruiter.disqualifyApplication({ ... });

    const stages = await stageService.getStagesByType('app-123', 'disqualified');
    expect(stages.length).toBe(1);
    expect(stages[0].status).toBe('completed');
  });
});
```

### E2E Tests

```typescript
test('Disqualify application', async ({ page }) => {
  await page.goto('/recruiter/applications/app-123');

  await page.click('button:has-text("Disqualify")');
  await page.fill('textarea[name="reason"]', 'Position has been filled');
  await page.check('input[name="shareWithCandidate"]');
  await page.click('button:has-text("Disqualify Application")');

  await expect(page.locator('text=Application disqualified')).toBeVisible();

  // Verify candidate sees disqualified stage
  await page.goto('/candidate/applications/app-123');
  await expect(page.locator('text=Application Closed')).toBeVisible();
  await expect(page.locator('text=Position has been filled')).toBeVisible();

  // Verify cannot create new stages
  await page.goto('/recruiter/applications/app-123');
  await page.click('button:has-text("Give Assignment")');
  await expect(
    page.locator('text=Cannot create stages for disqualified application')
  ).toBeVisible();
});
```

---

## 📊 Validation Checklist

- [ ] All 8 tasks completed
- [ ] Disqualification procedure working
- [ ] Stage creation blocked after disqualification
- [ ] Timeline event created
- [ ] Notification sent
- [ ] Reason shared/hidden correctly
- [ ] E2E tests passing

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled_

### File List

**Created:**

- [ ] Backend: `recruiterRouter.disqualifyApplication`
- [ ] Frontend: `DisqualifyModal.tsx`, `DisqualifiedStage.tsx`
- [ ] Hook: `useDisqualify.ts`
- [ ] Tests

**Modified:**

- [ ] `StageService.createStage` - Add disqualification check

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
