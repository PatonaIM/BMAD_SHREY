# Story 5.4: Assignment Stage Implementation (Candidate + Recruiter)

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 13  
**Priority**: P0  
**Sprint**: Sprint 2 (Weeks 3-4)  
**Status**: Draft

---

## 📋 Story Overview

Implement the complete assignment workflow for both recruiters and candidates, including creating assignments with document uploads, candidate submission of answers, and recruiter feedback. This story involves backend tRPC procedures, Azure Storage integration, and rich frontend components.

---

## 🎯 Acceptance Criteria

### Recruiter Side

- ✅ Can create assignment with title, description, document (upload or link), time limit
- ✅ Document uploads to Azure Storage successfully
- ✅ Assignment appears in timeline at correct position
- ✅ Can create up to 3 assignments per application
- ✅ Can cancel assignment if candidate hasn't started
- ✅ Can view submitted assignment documents
- ✅ Can provide feedback with rating (1-5 stars) and comments
- ✅ Feedback marks stage as completed

### Candidate Side

- ✅ Can view assignment details and download document
- ✅ Time limit countdown displays if specified
- ✅ Can upload answer document (PDF, DOC, images up to 5MB)
- ✅ Upload progress indicator works
- ✅ Cannot upload after submission
- ✅ Can view feedback once provided
- ✅ Receives notification when feedback added

---

## 📦 Deliverables

### Backend Tasks

- [ ] **Task 1**: Create Recruiter Assignment Procedures
  - [ ] Procedure: `recruiterRouter.giveAssignment`
    - Input: applicationId, title, description, documentUrl OR documentFile, timeLimit
    - Create assignment stage with status: awaiting_candidate
    - Upload document to Azure Storage if file provided
    - Validate: max 3 assignments per application
    - Create timeline event
    - Send notification to candidate
  - [ ] Procedure: `recruiterRouter.submitAssignmentFeedback`
    - Input: stageId, rating (1-5), comments
    - Update stage with feedback data
    - Change status to completed
    - Create timeline event
    - Send notification to candidate
  - [ ] Procedure: `recruiterRouter.cancelAssignment`
    - Input: stageId
    - Validate: candidate hasn't started (answerUrl is null)
    - Mark stage as skipped
    - Create timeline event
    - Send notification to candidate

- [ ] **Task 2**: Create Candidate Assignment Procedures
  - [ ] Procedure: `candidateRouter.uploadAssignmentAnswer`
    - Input: stageId, answerFile
    - Upload document to Azure Storage
    - Update stage with answerUrl, submittedAt
    - Change status from awaiting_candidate to awaiting_recruiter
    - Create timeline event
    - Send notification to recruiter
  - [ ] Procedure: `candidateRouter.getAssignment`
    - Input: stageId
    - Return assignment details with signed document URLs
    - Validate: candidate owns application

- [ ] **Task 3**: Azure Storage Integration
  - [ ] Function: `uploadAssignmentDocument(file, applicationId, type)`
    - Generate unique filename with timestamp
    - Upload to Azure Blob Storage container: assignments
    - Return public URL or signed URL
    - Handle upload errors gracefully
  - [ ] Function: `getSignedUrl(blobName, expiryMinutes)`
    - Generate SAS token for secure downloads
    - Return signed URL with expiry
  - [ ] Function: `deleteAssignmentDocument(blobName)`
    - Delete document from Azure Storage
    - Called when assignment is cancelled

- [ ] **Task 4**: Input Validation with Zod
  - [ ] Schema: `giveAssignmentSchema`
  - [ ] Schema: `uploadAssignmentAnswerSchema`
  - [ ] Schema: `submitFeedbackSchema`
  - [ ] Validate file size (max 5MB)
  - [ ] Validate file types (PDF, DOC, DOCX, JPG, PNG)

- [ ] **Task 5**: Write Backend Tests
  - [ ] Test: Create assignment with file upload
  - [ ] Test: Create assignment with URL
  - [ ] Test: Max 3 assignments validation
  - [ ] Test: Upload assignment answer
  - [ ] Test: Submit feedback
  - [ ] Test: Cancel assignment before submission
  - [ ] Test: Cannot cancel after submission
  - [ ] Test: Authorization checks

### Frontend Tasks

- [ ] **Task 6**: Create Recruiter Components
  - [ ] Component: `GiveAssignmentModal.tsx`
    - Form fields: title, description, documentUpload OR documentUrl, timeLimit
    - File upload with drag-and-drop
    - Upload progress indicator
    - Document preview after upload
    - Validation: required fields, file size/type
    - Submit button calls `recruiterRouter.giveAssignment`
  - [ ] Component: `AssignmentFeedbackModal.tsx`
    - Display assignment details and candidate answer
    - Download button for candidate submission
    - Star rating input (1-5)
    - Comments textarea (max 1000 chars)
    - Submit button calls `recruiterRouter.submitAssignmentFeedback`
  - [ ] Component: `AssignmentListView.tsx`
    - List view of all assignments for recruiter
    - Columns: Candidate, Title, Status, Submitted At, Actions
    - Filter by status: awaiting_candidate, awaiting_recruiter, completed
    - Click row to view details/provide feedback

- [ ] **Task 7**: Create Candidate Components
  - [ ] Component: `AssignmentStage.tsx`
    - Display assignment title, description
    - Download button for assignment document
    - Time limit countdown (if specified)
    - Upload assignment answer section
    - Show submission status
    - Show feedback once provided (rating + comments)
  - [ ] Component: `UploadAssignmentModal.tsx`
    - File upload with drag-and-drop
    - Upload progress indicator
    - File preview before submission
    - Validation: file size/type
    - Confirmation dialog before submit
    - Submit button calls `candidateRouter.uploadAssignmentAnswer`

- [ ] **Task 8**: Create Shared Components
  - [ ] Component: `FileUploadZone.tsx`
    - Drag-and-drop file upload
    - Click to browse files
    - File type/size validation
    - Progress bar
    - Error messages
  - [ ] Component: `StarRating.tsx`
    - Interactive star rating (1-5)
    - Half-star support optional
    - Read-only mode for display
    - Accessibility: keyboard navigation

- [ ] **Task 9**: Create Custom Hooks
  - [ ] Hook: `useAssignment.ts`
    - Functions: createAssignment, uploadAnswer, submitFeedback, cancelAssignment
    - Handle loading states
    - Handle error states
    - Optimistic updates
    - Refresh timeline after actions
  - [ ] Hook: `useFileUpload.ts`
    - Functions: uploadFile, trackProgress, cancelUpload
    - Handle upload errors with retry logic
    - Return upload progress percentage

- [ ] **Task 10**: Write Frontend Tests
  - [ ] Test: GiveAssignmentModal form validation
  - [ ] Test: File upload flow
  - [ ] Test: Upload progress indicator
  - [ ] Test: AssignmentStage displays correctly
  - [ ] Test: UploadAssignmentModal submission
  - [ ] Test: Star rating interaction
  - [ ] Test: Feedback modal submission
  - [ ] Test: Authorization (candidate cannot see other assignments)

- [ ] **Task 11**: E2E Testing
  - [ ] E2E: Recruiter creates assignment with file upload
  - [ ] E2E: Candidate views and downloads assignment
  - [ ] E2E: Candidate uploads answer
  - [ ] E2E: Recruiter provides feedback
  - [ ] E2E: File upload failure and retry
  - [ ] E2E: Cancel assignment before submission

---

## 🔗 Dependencies

- **Story 5.3**: Timeline UI Component (MUST be completed first)
  - Requires: Timeline components to display assignment stages
  - Requires: StageActions component for action buttons

- **Azure Storage**: Must be configured
  - Container: `assignments` (create if doesn't exist)
  - SAS token permissions: read, write, delete

---

## 🏗️ Technical Implementation Details

### File Upload Flow (Direct to Azure)

```typescript
// Client-side upload flow (avoids proxy through API)
1. User selects file
2. Client validates file size/type
3. Client requests signed upload URL from backend
   → POST /api/trpc/storage.getUploadUrl
4. Backend generates SAS token and returns signed URL
5. Client uploads file directly to Azure Blob Storage
   → PUT https://<storage>.blob.core.windows.net/assignments/<file>
6. Client sends completion notification to backend
   → POST /api/trpc/recruiter.giveAssignment (with blobName)
7. Backend updates stage with document URL
8. UI refreshes to show uploaded document
```

### Backend: Give Assignment Procedure

```typescript
// src/server/routers/recruiterRouter.ts
export const recruiterRouter = router({
  giveAssignment: protectedProcedure
    .input(giveAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const {
        applicationId,
        title,
        description,
        documentFile,
        documentUrl,
        timeLimit,
      } = input;

      // 1. Authorization: verify user is recruiter for this job
      const application = await applicationRepo.findById(applicationId);
      if (!application) throw new NotFoundError('Application not found');

      const job = await jobRepo.findById(application.jobId);
      if (job.recruiterId !== ctx.user.id) {
        throw new UnauthorizedError('Not authorized');
      }

      // 2. Business rule: max 3 assignments
      const existingAssignments = await stageService.getStagesByType(
        applicationId,
        'assignment'
      );
      if (existingAssignments.length >= 3) {
        throw new MaxStagesExceededError(
          'Maximum 3 assignments per application'
        );
      }

      // 3. Upload document to Azure if file provided
      let finalDocumentUrl = documentUrl;
      if (documentFile) {
        finalDocumentUrl = await azureStorageService.uploadAssignmentDocument(
          documentFile,
          applicationId,
          'assignment_question'
        );
      }

      // 4. Create assignment stage
      const stage = await stageService.createStage(
        applicationId,
        {
          type: 'assignment',
          title,
          status: 'awaiting_candidate',
          visibleToCandidate: true,
          data: {
            description,
            documentUrl: finalDocumentUrl,
            timeLimit,
            answerUrl: null,
            submittedAt: null,
            feedback: null,
          },
        },
        ctx.user.id
      );

      // 5. Create timeline event
      await timelineService.logEvent({
        applicationId,
        eventType: 'assignment_created',
        performedBy: ctx.user.id,
        metadata: { stageId: stage.id, title },
      });

      // 6. Send notification to candidate
      await notificationService.send({
        userId: application.candidateId,
        type: 'assignment_received',
        data: { applicationId, stageId: stage.id, title },
      });

      return { stage };
    }),
});
```

### Backend: Upload Assignment Answer Procedure

```typescript
// src/server/routers/candidateRouter.ts
export const candidateRouter = router({
  uploadAssignmentAnswer: protectedProcedure
    .input(uploadAssignmentAnswerSchema)
    .mutation(async ({ input, ctx }) => {
      const { stageId, answerFile } = input;

      // 1. Fetch stage
      const stage = await stageRepo.findById(stageId);
      if (!stage) throw new NotFoundError('Stage not found');

      // 2. Authorization: verify candidate owns application
      const application = await applicationRepo.findById(stage.applicationId);
      if (application.candidateId !== ctx.user.id) {
        throw new UnauthorizedError('Not authorized');
      }

      // 3. Validate: cannot submit if already submitted
      if (stage.data.answerUrl) {
        throw new BusinessRuleError('Assignment already submitted');
      }

      // 4. Upload answer to Azure Storage
      const answerUrl = await azureStorageService.uploadAssignmentDocument(
        answerFile,
        stage.applicationId,
        'assignment_answer'
      );

      // 5. Update stage
      await stageService.addStageData(
        stageId,
        {
          answerUrl,
          submittedAt: new Date(),
        },
        ctx.user.id
      );

      await stageService.updateStageStatus(
        stageId,
        'awaiting_recruiter',
        ctx.user.id
      );

      // 6. Create timeline event
      await timelineService.logEvent({
        applicationId: stage.applicationId,
        eventType: 'assignment_submitted',
        performedBy: ctx.user.id,
        metadata: { stageId, answerUrl },
      });

      // 7. Notify recruiter
      const job = await jobRepo.findById(application.jobId);
      await notificationService.send({
        userId: job.recruiterId,
        type: 'assignment_submitted',
        data: { applicationId: stage.applicationId, stageId },
      });

      return { success: true };
    }),
});
```

### Frontend: GiveAssignmentModal Component

```tsx
// src/components/recruiter/actions/GiveAssignmentModal.tsx
export function GiveAssignmentModal({ applicationId, isOpen, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { createAssignment, isLoading } = useAssignment();
  const { uploadFile } = useFileUpload();

  const handleSubmit = async () => {
    try {
      // Upload file if provided
      let finalDocumentUrl = documentUrl;
      if (documentFile) {
        finalDocumentUrl = await uploadFile(documentFile, {
          onProgress: setUploadProgress,
        });
      }

      await createAssignment({
        applicationId,
        title,
        description,
        documentUrl: finalDocumentUrl,
        timeLimit,
      });

      toast.success('Assignment created successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>Give Assignment</ModalHeader>

      <ModalBody>
        <Input
          label="Assignment Title"
          value={title}
          onChange={setTitle}
          required
        />

        <Textarea
          label="Description"
          value={description}
          onChange={setDescription}
          rows={5}
          required
        />

        <FileUploadZone
          accept="application/pdf,.doc,.docx"
          maxSize={5 * 1024 * 1024}
          onFileSelect={setDocumentFile}
          progress={uploadProgress}
        />

        <Input
          label="Or paste document URL"
          value={documentUrl}
          onChange={setDocumentUrl}
          placeholder="https://..."
        />

        <Input
          label="Time Limit (hours, optional)"
          type="number"
          value={timeLimit || ''}
          onChange={val => setTimeLimit(val ? Number(val) : null)}
        />
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!title || !description || isLoading}
          loading={isLoading}
        >
          Create Assignment
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Frontend: AssignmentStage Component

```tsx
// src/components/candidate/stages/AssignmentStage.tsx
export function AssignmentStage({ stage }: { stage: ApplicationStage }) {
  const data = stage.data as AssignmentData;
  const [showUploadModal, setShowUploadModal] = useState(false);

  const timeRemaining = useMemo(() => {
    if (!data.timeLimit || data.submittedAt) return null;
    const deadline = addHours(stage.createdAt, data.timeLimit);
    return formatDistanceToNow(deadline);
  }, [data.timeLimit, data.submittedAt, stage.createdAt]);

  return (
    <div className="assignment-stage">
      <h3 className="text-xl font-semibold">{stage.title}</h3>

      <p className="text-gray-700 dark:text-gray-300 mt-2">
        {data.description}
      </p>

      {data.documentUrl && (
        <Button
          variant="outline"
          icon={<DownloadIcon />}
          onClick={() => window.open(data.documentUrl, '_blank')}
        >
          Download Assignment
        </Button>
      )}

      {data.timeLimit && !data.submittedAt && (
        <Alert variant="warning">
          <ClockIcon />
          Time remaining: {timeRemaining}
        </Alert>
      )}

      {/* Upload section */}
      {!data.submittedAt && (
        <Button variant="primary" onClick={() => setShowUploadModal(true)}>
          Upload Answer
        </Button>
      )}

      {/* Submitted status */}
      {data.submittedAt && (
        <Alert variant="success">
          <CheckIcon />
          Submitted on {format(data.submittedAt, 'PPpp')}
        </Alert>
      )}

      {/* Feedback section */}
      {data.feedback && (
        <div className="feedback mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <h4 className="font-semibold">Recruiter Feedback</h4>
          <StarRating value={data.feedback.rating} readOnly />
          <p className="mt-2">{data.feedback.comments}</p>
        </div>
      )}

      <UploadAssignmentModal
        stageId={stage.id}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  );
}
```

### Zod Schemas

```typescript
// Input validation schemas
export const giveAssignmentSchema = z
  .object({
    applicationId: z.string().uuid(),
    title: z.string().min(5).max(200),
    description: z.string().min(10).max(2000),
    documentFile: z.instanceof(File).optional(),
    documentUrl: z.string().url().optional(),
    timeLimit: z.number().int().min(1).max(168).optional(), // 1 hour to 1 week
  })
  .refine(data => data.documentFile || data.documentUrl, {
    message: 'Either documentFile or documentUrl must be provided',
  });

export const uploadAssignmentAnswerSchema = z.object({
  stageId: z.string().uuid(),
  answerFile: z
    .instanceof(File)
    .refine(
      file => file.size <= 5 * 1024 * 1024,
      'File size must be less than 5MB'
    )
    .refine(
      file =>
        [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
        ].includes(file.type),
      'Only PDF, DOC, DOCX, JPG, PNG files are allowed'
    ),
});

export const submitFeedbackSchema = z.object({
  stageId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().min(10).max(1000),
});
```

---

## 🧪 Testing Strategy

### Backend Unit Tests

```typescript
describe('recruiterRouter.giveAssignment', () => {
  it('creates assignment successfully', async () => {
    const result = await caller.recruiter.giveAssignment({
      applicationId: 'app-123',
      title: 'Technical Assignment',
      description: 'Build a REST API',
      documentUrl: 'https://example.com/doc.pdf',
      timeLimit: 48,
    });

    expect(result.stage.type).toBe('assignment');
    expect(result.stage.status).toBe('awaiting_candidate');
  });

  it('throws error if max 3 assignments exceeded', async () => {
    // Create 3 assignments first
    await createAssignments(3);

    await expect(
      caller.recruiter.giveAssignment({ ... })
    ).rejects.toThrow('Maximum 3 assignments');
  });

  it('uploads file to Azure Storage', async () => {
    const file = new File(['content'], 'assignment.pdf');
    const result = await caller.recruiter.giveAssignment({
      applicationId: 'app-123',
      title: 'Test',
      description: 'Test desc',
      documentFile: file,
    });

    expect(result.stage.data.documentUrl).toContain('blob.core.windows.net');
  });
});
```

### Frontend Component Tests

```typescript
describe('GiveAssignmentModal', () => {
  it('validates required fields', async () => {
    render(<GiveAssignmentModal applicationId="app-123" isOpen onClose={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/title/i), 'Test Assignment');
    await userEvent.type(screen.getByLabelText(/description/i), 'Test description here');

    expect(submitButton).toBeDisabled(); // Still disabled (no document)

    await userEvent.type(screen.getByLabelText(/url/i), 'https://example.com/doc.pdf');
    expect(submitButton).toBeEnabled();
  });

  it('shows upload progress', async () => {
    const { rerender } = render(<GiveAssignmentModal ... />);

    const file = new File(['content'], 'assignment.pdf');
    const fileInput = screen.getByLabelText(/upload/i);

    await userEvent.upload(fileInput, file);

    // Simulate progress updates
    rerender(<GiveAssignmentModal uploadProgress={50} ... />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
test('Complete assignment workflow', async ({ page }) => {
  // 1. Recruiter creates assignment
  await page.goto('/recruiter/applications/app-123');
  await page.click('button:has-text("Give Assignment")');
  await page.fill('input[name="title"]', 'Technical Test');
  await page.fill(
    'textarea[name="description"]',
    'Build a REST API with authentication'
  );
  await page.setInputFiles('input[type="file"]', 'test-assignment.pdf');
  await page.click('button:has-text("Create Assignment")');
  await expect(page.locator('text=Assignment created')).toBeVisible();

  // 2. Candidate views assignment
  await page.goto('/candidate/applications/app-123');
  await expect(page.locator('text=Technical Test')).toBeVisible();
  await page.click('button:has-text("Download Assignment")');

  // 3. Candidate uploads answer
  await page.click('button:has-text("Upload Answer")');
  await page.setInputFiles('input[type="file"]', 'test-answer.pdf');
  await page.click('button:has-text("Submit")');
  await expect(page.locator('text=Submitted')).toBeVisible();

  // 4. Recruiter provides feedback
  await page.goto('/recruiter/applications/app-123');
  await page.click('button:has-text("Provide Feedback")');
  await page.click('[aria-label="4 stars"]');
  await page.fill(
    'textarea[name="comments"]',
    'Great work! API is well-structured.'
  );
  await page.click('button:has-text("Submit Feedback")');
  await expect(page.locator('text=Feedback submitted')).toBeVisible();

  // 5. Candidate sees feedback
  await page.goto('/candidate/applications/app-123');
  await expect(page.locator('text=Great work!')).toBeVisible();
  await expect(page.locator('[aria-label="Rating: 4 out of 5"]')).toBeVisible();
});
```

---

## 📊 Validation Checklist

Before marking this story complete:

- [ ] All 11 tasks completed
- [ ] Backend procedures implemented and tested
- [ ] Azure Storage integration working
- [ ] Frontend components implemented
- [ ] File upload with progress indicator working
- [ ] Max 3 assignments validation working
- [ ] Feedback system working (rating + comments)
- [ ] E2E test passing
- [ ] Unit tests: 85%+ coverage
- [ ] Authorization checks in place
- [ ] Code reviewed and approved
- [ ] No TypeScript errors

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Completion Notes

_To be filled by dev agent upon completion_

### Debug Log References

_Add any debugging notes or issues encountered_

### File List

**Created Files:**

- [ ] Backend procedures in `src/server/routers/recruiterRouter.ts`
- [ ] Backend procedures in `src/server/routers/candidateRouter.ts`
- [ ] `src/services/azureStorageService.ts` (if doesn't exist)
- [ ] `src/components/recruiter/actions/GiveAssignmentModal.tsx`
- [ ] `src/components/recruiter/actions/AssignmentFeedbackModal.tsx`
- [ ] `src/components/recruiter/lists/AssignmentListView.tsx`
- [ ] `src/components/candidate/stages/AssignmentStage.tsx`
- [ ] `src/components/candidate/actions/UploadAssignmentModal.tsx`
- [ ] `src/components/shared/FileUploadZone.tsx`
- [ ] `src/components/shared/StarRating.tsx`
- [ ] `src/hooks/useAssignment.ts`
- [ ] `src/hooks/useFileUpload.ts`
- [ ] Tests for all components and procedures

**Modified Files:**

- [ ] `src/server/routers/index.ts` (add assignment routes)
- [ ] Azure Storage configuration (if needed)

### Change Log

_Document significant changes made during implementation_

---

## 📝 Dev Notes

- Direct-to-Azure upload avoids API server becoming bottleneck
- SAS tokens with short expiry (15 min) for security
- File size limit (5MB) prevents abuse and storage costs
- Max 3 assignments prevents recruiter spam
- Time limit countdown creates urgency for candidates
- Star rating provides quick visual feedback
- Notification system keeps both parties informed

---

## 🔗 Related Stories

- **Story 5.3**: Timeline UI Component (dependency)
- **Story 5.5**: Live Interview Stage (similar file upload patterns)
- **Story 5.6**: Offer Stage (similar document handling)

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
