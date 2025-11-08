# Story 5.6: Offer Stage & Acceptance Flow

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 9  
**Priority**: P0  
**Sprint**: Sprint 3 (Weeks 5-6)  
**Status**: Draft

---

## 📋 Story Overview

Implement the offer workflow including offer letter upload, candidate acceptance/rejection, automatic creation of offer_accepted stage on acceptance, and application disqualification on rejection.

---

## 🎯 Acceptance Criteria

### Recruiter Side

- ✅ "Send Offer" button available after interviews/assignments completed
- ✅ Can upload offer letter PDF (Azure Storage)
- ✅ Offer stage created with status: awaiting_candidate
- ✅ Can view pending/accepted/rejected offers in list
- ✅ offer_accepted stage automatically created on acceptance
- ✅ Application marked as disqualified on rejection (with reason)
- ✅ Can revoke offer before candidate decision

### Candidate Side

- ✅ Can view offer letter (inline PDF viewer or download)
- ✅ Accept/Reject buttons prominently displayed
- ✅ Rejection requires optional reason (textarea, 500 chars max)
- ✅ Acceptance confirmation dialog with next steps
- ✅ Transitions to "Offer Accepted" stage after acceptance
- ✅ Journey stops with "Application Closed" after rejection
- ✅ Receives notification when offer sent

---

## 📦 Deliverables

### Backend Tasks

- [ ] **Task 1**: Recruiter Offer Procedures
  - [ ] `recruiterRouter.sendOffer` - Upload PDF, create offer stage
  - [ ] `recruiterRouter.revokeOffer` - Cancel before decision
  - [ ] Input validation: PDF only, max 10MB
  - [ ] Azure Storage upload to `offers` container
  - [ ] Create timeline event and notification

- [ ] **Task 2**: Candidate Offer Procedures
  - [ ] `candidateRouter.respondToOffer` - Accept or reject
  - [ ] `candidateRouter.getOfferLetter` - Return signed URL
  - [ ] On accept: create offer_accepted stage, mark offer completed
  - [ ] On reject: mark application isDisqualified:true, mark offer skipped
  - [ ] Create timeline events and notifications

- [ ] **Task 3**: State Transition Logic
  - [ ] Accept: Create offer_accepted stage automatically
  - [ ] Reject: Update application.isDisqualified and disqualificationReason
  - [ ] Revoke: Mark offer stage as skipped
  - [ ] Validate offer can only be responded to once

- [ ] **Task 4**: Write Backend Tests
  - [ ] Test: Send offer uploads PDF to Azure
  - [ ] Test: Accept offer creates offer_accepted stage
  - [ ] Test: Reject offer disqualifies application
  - [ ] Test: Revoke offer before response works
  - [ ] Test: Cannot respond twice to same offer
  - [ ] Test: Authorization checks

### Frontend Tasks

- [ ] **Task 5**: Recruiter Components
  - [ ] `SendOfferModal.tsx` - Upload PDF form
  - [ ] `RevokeOfferModal.tsx` - Confirmation dialog
  - [ ] `OfferListView.tsx` - List pending/accepted/rejected

- [ ] **Task 6**: Candidate Components
  - [ ] `OfferStage.tsx` - Display offer with PDF viewer
  - [ ] `OfferDecisionModal.tsx` - Accept/Reject confirmation
  - [ ] Rejection reason textarea (optional)
  - [ ] Acceptance next steps message

- [ ] **Task 7**: Shared Components
  - [ ] `PdfViewer.tsx` - Inline PDF display or download

- [ ] **Task 8**: Custom Hooks
  - [ ] `useOffer.ts` - sendOffer, respondToOffer, revokeOffer

- [ ] **Task 9**: Write Frontend Tests
  - [ ] Test: SendOfferModal PDF upload
  - [ ] Test: OfferStage displays PDF
  - [ ] Test: Accept/Reject buttons work
  - [ ] Test: Confirmation dialogs

- [ ] **Task 10**: E2E Testing
  - [ ] E2E: Send offer → Accept → Onboarding
  - [ ] E2E: Send offer → Reject → Application closed
  - [ ] E2E: Revoke offer before response

---

## 🔗 Dependencies

- **Story 5.3**: Timeline UI Component

---

## 🏗️ Technical Implementation

### State Transitions

```typescript
// Accept offer
offer stage: awaiting_candidate → completed
application: create offer_accepted stage
application.currentStageId = offer_accepted_stage_id

// Reject offer
offer stage: awaiting_candidate → skipped
application.isDisqualified = true
application.disqualificationReason = 'offer_rejected: <candidate_reason>'

// Revoke offer
offer stage: awaiting_candidate → skipped
send notification to candidate
```

### Backend: Send Offer

```typescript
recruiterRouter.sendOffer: protectedProcedure
  .input(z.object({
    applicationId: z.string().uuid(),
    offerLetterFile: z.instanceof(File)
      .refine(file => file.type === 'application/pdf', 'Only PDF allowed')
      .refine(file => file.size <= 10 * 1024 * 1024, 'Max 10MB'),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Authorization check
    // 2. Upload PDF to Azure Storage (offers container)
    // 3. Create offer stage with offerLetterUrl
    // 4. Set status: awaiting_candidate
    // 5. Create timeline event
    // 6. Send notification to candidate
  })
```

### Backend: Respond to Offer

```typescript
candidateRouter.respondToOffer: protectedProcedure
  .input(z.object({
    stageId: z.string().uuid(),
    decision: z.enum(['accept', 'reject']),
    rejectionReason: z.string().max(500).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Fetch offer stage
    // 2. Validate: candidate owns application
    // 3. Validate: offer not already responded to

    if (input.decision === 'accept') {
      // 4a. Mark offer stage completed
      await stageService.updateStageStatus(stageId, 'completed', ctx.user.id);

      // 5a. Create offer_accepted stage
      const offerAcceptedStage = await stageService.createStage(
        application.id,
        {
          type: 'offer_accepted',
          title: 'Offer Accepted',
          status: 'in_progress',
          visibleToCandidate: true,
          data: {
            acceptedAt: new Date(),
            onboardingDocuments: [],
          },
        },
        ctx.user.id
      );

      // 6a. Update application.currentStageId
      await applicationRepo.update(application.id, {
        currentStageId: offerAcceptedStage.id,
      });

      // 7a. Notify recruiter of acceptance
    } else {
      // 4b. Mark offer stage skipped
      await stageService.updateStageStatus(stageId, 'skipped', ctx.user.id);

      // 5b. Disqualify application
      await applicationRepo.update(application.id, {
        isDisqualified: true,
        disqualificationReason: `Offer rejected by candidate: ${input.rejectionReason || 'No reason provided'}`,
      });

      // 6b. Notify recruiter of rejection
    }

    // 8. Create timeline event
    // 9. Return success
  })
```

### Frontend: OfferStage

```tsx
export function OfferStage({ stage }: { stage: ApplicationStage }) {
  const data = stage.data as OfferData;
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const { respondToOffer } = useOffer();

  return (
    <div className="offer-stage">
      <h3 className="text-2xl font-bold">🎉 You received an offer!</h3>

      <PdfViewer url={data.offerLetterUrl} />

      <Button
        variant="outline"
        icon={<DownloadIcon />}
        onClick={() => window.open(data.offerLetterUrl, '_blank')}
      >
        Download Offer Letter
      </Button>

      {stage.status === 'awaiting_candidate' && (
        <div className="flex gap-4 mt-6">
          <Button
            variant="success"
            size="large"
            onClick={() => setShowDecisionModal(true)}
          >
            Accept Offer
          </Button>

          <Button
            variant="error"
            size="large"
            onClick={() => setShowDecisionModal(true)}
          >
            Decline Offer
          </Button>
        </div>
      )}

      {stage.status === 'completed' && (
        <Alert variant="success">
          ✅ You accepted the offer on {format(data.acceptedAt, 'PPP')}
        </Alert>
      )}

      {stage.status === 'skipped' && (
        <Alert variant="info">Application closed: Offer declined</Alert>
      )}

      <OfferDecisionModal
        stageId={stage.id}
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
      />
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Backend Tests

- Send offer uploads PDF correctly
- Accept offer creates offer_accepted stage
- Reject offer disqualifies application
- Cannot respond twice to same offer
- Revoke offer works before response

### E2E Tests

- Complete happy path: Send → Accept → Onboarding
- Rejection flow: Send → Reject → Closed
- Revoke before candidate decision

---

## 📊 Validation Checklist

- [ ] All 10 tasks completed
- [ ] PDF upload to Azure working
- [ ] Accept flow creates offer_accepted stage
- [ ] Reject flow disqualifies application
- [ ] Revoke offer working
- [ ] E2E tests passing
- [ ] Unit tests: 85%+ coverage

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled_

### Completion Notes

_To be filled_

### File List

**Created:**

- [ ] Backend: `recruiterRouter.sendOffer`, `recruiterRouter.revokeOffer`
- [ ] Backend: `candidateRouter.respondToOffer`, `candidateRouter.getOfferLetter`
- [ ] Frontend: `SendOfferModal.tsx`, `RevokeOfferModal.tsx`, `OfferListView.tsx`
- [ ] Frontend: `OfferStage.tsx`, `OfferDecisionModal.tsx`
- [ ] Frontend: `PdfViewer.tsx`
- [ ] Hook: `useOffer.ts`
- [ ] Tests

---

## 📝 Dev Notes

- PDF viewer can use iframe or libraries like react-pdf
- Offer acceptance is a critical milestone - ensure reliable notifications
- Rejection reason helps recruiters improve offers
- offer_accepted stage enables onboarding workflow (Story 5.7)

---

## 🔗 Related Stories

- **Story 5.3**: Timeline UI (dependency)
- **Story 5.7**: Onboarding Documents (follows offer acceptance)

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
