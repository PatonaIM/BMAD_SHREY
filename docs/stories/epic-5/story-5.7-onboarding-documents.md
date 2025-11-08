# Story 5.7: Onboarding Document Upload (Offer Accepted Stage)

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 5  
**Priority**: P1  
**Sprint**: Sprint 4 (Weeks 7-8)  
**Status**: Draft

---

## 📋 Story Overview

After a candidate accepts an offer, implement document collection for onboarding (ID proof, education certificates, background check, tax forms, etc.). Candidates upload required documents, recruiters review them, and mark onboarding as complete.

---

## 🎯 Acceptance Criteria

### Candidate Side

- ✅ Offer Accepted stage displays welcome message
- ✅ Document checklist shows required documents (ID, Education, Other)
- ✅ Can upload documents (PDF, images up to 5MB each)
- ✅ Progress indicator shows uploaded vs required
- ✅ Uploaded documents list with filenames and timestamps
- ✅ Cannot proceed until all required documents uploaded

### Recruiter Side

- ✅ Can view onboarding document status
- ✅ Can download uploaded documents
- ✅ Can mark onboarding as complete
- ✅ Receives notification when all documents uploaded

---

## 📦 Deliverables

### Backend Tasks

- [ ] **Task 1**: Candidate Onboarding Procedures
  - [ ] `candidateRouter.uploadOnboardingDocument` - Upload by type
  - [ ] `candidateRouter.getOnboardingDocuments` - Fetch all docs
  - [ ] Validate document type, size (max 5MB)
  - [ ] Upload to Azure Storage `onboarding` container
  - [ ] Update offer_accepted stage with document data
  - [ ] Notify recruiter when all required docs uploaded

- [ ] **Task 2**: Recruiter Onboarding Procedures
  - [ ] `recruiterRouter.reviewOnboardingDocuments` - View candidate docs
  - [ ] `recruiterRouter.markOnboardingComplete` - Complete onboarding
  - [ ] Change offer_accepted status to completed
  - [ ] Create timeline event

- [ ] **Task 3**: Document Type Definitions
  - [ ] Enum: ID_PROOF, EDUCATION_CERTIFICATE, BACKGROUND_CHECK, TAX_FORMS, OTHER
  - [ ] Track: type, fileName, fileUrl, uploadedAt, required
  - [ ] Required documents configurable (default: ID_PROOF, EDUCATION_CERTIFICATE)

- [ ] **Task 4**: Write Backend Tests
  - [ ] Test: Upload document by type
  - [ ] Test: Validate file size (reject >5MB)
  - [ ] Test: Validate file types (PDF, images only)
  - [ ] Test: Notification when all required docs uploaded
  - [ ] Test: Mark onboarding complete

### Frontend Tasks

- [ ] **Task 5**: Candidate Components
  - [ ] `OfferAcceptedStage.tsx` - Welcome message and document checklist
  - [ ] `OnboardingDocumentUpload.tsx` - Upload by document type
  - [ ] Progress bar showing completion percentage
  - [ ] Document list with download links

- [ ] **Task 6**: Recruiter Components
  - [ ] `OnboardingDocumentReview.tsx` - View all candidate documents
  - [ ] Download buttons for each document
  - [ ] Mark complete button

- [ ] **Task 7**: Custom Hooks
  - [ ] `useOnboarding.ts` - uploadDocument, getDocuments, markComplete

- [ ] **Task 8**: Write Frontend Tests
  - [ ] Test: OfferAcceptedStage displays checklist
  - [ ] Test: Document upload works
  - [ ] Test: Progress indicator updates
  - [ ] Test: Mark complete button

- [ ] **Task 9**: E2E Testing
  - [ ] E2E: Accept offer → Upload all docs → Mark complete

---

## 🔗 Dependencies

- **Story 5.6**: Offer acceptance (creates offer_accepted stage)

---

## 🏗️ Technical Implementation

### Document Types

```typescript
enum OnboardingDocumentType {
  ID_PROOF = 'id_proof',
  EDUCATION_CERTIFICATE = 'education_certificate',
  BACKGROUND_CHECK = 'background_check',
  TAX_FORMS = 'tax_forms',
  OTHER = 'other',
}

interface OnboardingDocument {
  type: OnboardingDocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  required: boolean;
}

interface OfferAcceptedData {
  acceptedAt: Date;
  onboardingDocuments: OnboardingDocument[];
  requiredDocumentTypes: OnboardingDocumentType[];
  onboardingCompletedAt?: Date;
}
```

### Backend: Upload Document

```typescript
candidateRouter.uploadOnboardingDocument: protectedProcedure
  .input(z.object({
    stageId: z.string().uuid(),
    documentType: z.nativeEnum(OnboardingDocumentType),
    file: z.instanceof(File)
      .refine(file => file.size <= 5 * 1024 * 1024, 'Max 5MB')
      .refine(
        file => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
        'Only PDF and images allowed'
      ),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Fetch offer_accepted stage
    // 2. Authorization check
    // 3. Upload file to Azure Storage (onboarding container)
    // 4. Add document to onboardingDocuments array
    // 5. Check if all required documents uploaded
    //    If yes: notify recruiter
    // 6. Create timeline event
  })
```

### Frontend: OfferAcceptedStage

```tsx
export function OfferAcceptedStage({ stage }: { stage: ApplicationStage }) {
  const data = stage.data as OfferAcceptedData;
  const { uploadDocument } = useOnboarding();

  const uploadedTypes = data.onboardingDocuments.map(doc => doc.type);
  const missingTypes = data.requiredDocumentTypes.filter(
    type => !uploadedTypes.includes(type)
  );

  const progress =
    (uploadedTypes.length / data.requiredDocumentTypes.length) * 100;

  return (
    <div className="offer-accepted-stage">
      <h3 className="text-2xl font-bold">🎉 Welcome to the team!</h3>
      <p className="mt-2">
        To complete your onboarding, please upload the following documents:
      </p>

      <ProgressBar
        value={progress}
        label={`${uploadedTypes.length} of ${data.requiredDocumentTypes.length} uploaded`}
      />

      <div className="document-checklist mt-6">
        {data.requiredDocumentTypes.map(type => {
          const doc = data.onboardingDocuments.find(d => d.type === type);
          return (
            <div key={type} className="checklist-item">
              {doc ? (
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="text-green-500" />
                  <span>{formatDocumentType(type)}</span>
                  <a href={doc.fileUrl} download className="text-blue-500">
                    Download
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CircleIcon className="text-gray-300" />
                  <span>{formatDocumentType(type)}</span>
                  <OnboardingDocumentUpload
                    stageId={stage.id}
                    documentType={type}
                    onUpload={uploadDocument}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.onboardingCompletedAt && (
        <Alert variant="success" className="mt-4">
          ✅ Onboarding completed on {format(data.onboardingCompletedAt, 'PPP')}
        </Alert>
      )}
    </div>
  );
}
```

---

## 🧪 Testing Strategy

- Upload each document type
- Validate file size rejection
- Progress indicator updates correctly
- Notification sent when all docs uploaded
- Mark onboarding complete works

---

## 📊 Validation Checklist

- [ ] All 9 tasks completed
- [ ] Document upload working
- [ ] Progress indicator accurate
- [ ] Required documents enforced
- [ ] Mark complete functionality working
- [ ] E2E test passing

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled_

### File List

**Created:**

- [ ] Backend: `candidateRouter.uploadOnboardingDocument`, `candidateRouter.getOnboardingDocuments`
- [ ] Backend: `recruiterRouter.reviewOnboardingDocuments`, `recruiterRouter.markOnboardingComplete`
- [ ] Frontend: `OfferAcceptedStage.tsx`, `OnboardingDocumentUpload.tsx`, `OnboardingDocumentReview.tsx`
- [ ] Hook: `useOnboarding.ts`
- [ ] Tests

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
