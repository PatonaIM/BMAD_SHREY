# Story 5.2: Stage Service & Repository Layer

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 8  
**Priority**: P0  
**Sprint**: Sprint 1 (Weeks 1-2)  
**Status**: In Progress

---

## 📋 Story Overview

Implement the service and repository layer for managing application stages, including business logic validation, CRUD operations, and integration with the existing MongoDB data layer. This story builds on Story 5.1's type definitions to provide the API layer for all stage operations.

---

## 🎯 Acceptance Criteria

- ✅ All CRUD operations work correctly (create, read, update, delete stages)
- ✅ Business rules enforced (max 3 assignments, max 3 live interviews)
- ✅ Stage transitions validated (cannot skip from pending to completed)
- ✅ Role-based filtering works (candidates see only visible stages)
- ✅ Integration with TimelineService for audit events
- ✅ 85%+ test coverage
- ✅ All error cases handled with specific error types

---

## 📦 Deliverables

### Tasks

- [x] **Task 1**: Create ApplicationStageRepository
  - [x] File: `src/data-access/repositories/applicationStageRepo.ts`
  - [x] Implement findById, findByApplicationId, create, update, delete
  - [x] Add query methods: findByType, findActiveStage, findPendingStages
  - [x] Implement atomic update operations for stage status changes
  - [x] Add proper error handling with custom error types

- [x] **Task 2**: Create StageService
  - [x] File: `src/services/stageService.ts` (400+ lines)
  - [x] Implement createStage with validation
  - [x] Implement updateStageStatus with transition validation
  - [x] Implement addStageData for polymorphic data updates
  - [x] Implement getActiveStage, getStagesByType
  - [x] Implement canProgressToStage business rule checker
  - [x] Implement validateStageTransition
  - [x] Implement getVisibleStages (role-based filtering)
  - [x] Integrate with TimelineService for audit logging

- [x] **Task 3**: Create tRPC Procedures
  - [x] File: `src/services/trpc/stageRouter.ts`
  - [x] Procedure: `stages.create` - Create new stage
  - [x] Procedure: `stages.updateStatus` - Update stage status
  - [x] Procedure: `stages.addData` - Add stage-specific data
  - [x] Procedure: `stages.list` - Get stages for application
  - [x] Procedure: `stages.getActive` - Get active stage
  - [x] Procedure: `stages.getByType` - Get stages by type
  - [x] Procedure: `stages.getStats` - Get stage statistics
  - [x] Procedure: `stages.delete` - Delete stage (with validation)
  - [x] Add Zod schemas for input validation
  - [x] Add authorization checks (user owns application)
  - [x] Added ownsApplication middleware for security

- [x] **Task 4**: Enhance stageValidation.ts
  - [x] Extend validation functions from Story 5.1
  - [x] Add validateBusinessRules (max assignments, max interviews)
  - [x] Add validateStageOrder (ensure proper sequence)
  - [x] Add validateRequiredFields for each stage type
  - [x] Add validateStageCreation (comprehensive validation)
  - [x] Add validateStageCompletion (completion validation)
  - [x] Add error messages with helpful context

- [x] **Task 5**: Write Unit Tests
  - [x] File: `src/services/__tests__/stageService.test.ts`
  - [x] Test all CRUD operations
  - [x] Test business rule validation (max stages, transitions)
  - [x] Test role-based filtering
  - [x] Test error cases (invalid transitions, max exceeded)
  - [x] Mock repository layer
  - [x] 50+ test cases covering core functionality

- [ ] **Task 6**: Write Integration Tests
  - [ ] File: `__tests__/integration/stageService.integration.test.ts`
  - [ ] Test with real MongoDB (test database)
  - [ ] Test complete workflows (create → update → complete)
  - [ ] Test transaction rollback scenarios
  - [ ] Test performance with multiple stages

- [x] **Task 7**: Update Application Model
  - [x] File: `src/utils/applicationHelpers.ts` (created utility functions)
  - [x] 20+ helper functions for working with Application objects
  - [x] getStageById, getCurrentStage, getStagesByType
  - [x] getCompletedStages, getPendingStages, getVisibleStages
  - [x] Progress tracking: getApplicationProgress, getApplicationDuration
  - [x] Status checks: isApplicationActive, isApplicationComplete
  - [x] Summary function: getApplicationStageSummary

- [ ] **Task 8**: API Documentation
  - [ ] Document all tRPC procedures with JSDoc
  - [ ] Create API usage examples
  - [ ] Document error codes and responses
  - [ ] Add to developer handoff documentation

---

## 🔗 Dependencies

- **Story 5.1**: Core Stage Data Model (MUST be completed first)
  - Requires: ApplicationStage types, StageType, StageStatus enums
  - Requires: stageHelpers.ts utility functions
  - Requires: Basic stageValidation.ts functions

---

## 🏗️ Technical Implementation Details

### StageService Key Methods

```typescript
class StageService {
  constructor(
    private stageRepo: ApplicationStageRepository,
    private applicationRepo: ApplicationRepository,
    private timelineService: TimelineService
  ) {}

  async createStage(
    applicationId: string,
    stageData: CreateStageInput,
    createdBy: string
  ): Promise<ApplicationStage> {
    // 1. Validate business rules (max stages for type)
    // 2. Validate stage order/sequence
    // 3. Create stage record
    // 4. Update application.stages array
    // 5. Create timeline event
    // 6. Return created stage
  }

  async updateStageStatus(
    stageId: string,
    newStatus: StageStatus,
    updatedBy: string
  ): Promise<void> {
    // 1. Fetch current stage
    // 2. Validate transition (pending → in_progress OK, pending → completed NOT OK)
    // 3. Update status with timestamp
    // 4. Create timeline event
    // 5. Update application.currentStageId if needed
  }

  async addStageData(
    stageId: string,
    data: Partial<StageData>,
    updatedBy: string
  ): Promise<void> {
    // 1. Fetch stage
    // 2. Merge data (preserve existing fields)
    // 3. Validate required fields for stage type
    // 4. Update stage record
    // 5. Create timeline event
  }

  async getActiveStage(
    applicationId: string
  ): Promise<ApplicationStage | null> {
    // Return stage with status: in_progress or awaiting_candidate/awaiting_recruiter
  }

  async getStagesByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]> {
    // Return all stages of specific type (e.g., all assignments)
  }

  async canProgressToStage(
    applicationId: string,
    stageType: StageType
  ): Promise<boolean> {
    // Check if application can add this stage type
    // E.g., can only add live_interview after assignment completed
  }

  async validateStageTransition(
    currentStatus: StageStatus,
    newStatus: StageStatus
  ): Promise<boolean> {
    // Validate status transition rules
    // E.g., pending → in_progress → completed (cannot skip)
  }

  async getVisibleStages(
    applicationId: string,
    role: 'candidate' | 'recruiter'
  ): Promise<ApplicationStage[]> {
    // Candidates see only visibleToCandidate: true
    // Recruiters see all stages
  }
}
```

### ApplicationStageRepository

```typescript
class ApplicationStageRepository {
  async findById(stageId: string): Promise<ApplicationStage | null>;
  async findByApplicationId(applicationId: string): Promise<ApplicationStage[]>;
  async findByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]>;
  async findActiveStage(
    applicationId: string
  ): Promise<ApplicationStage | null>;
  async findPendingStages(applicationId: string): Promise<ApplicationStage[]>;
  async create(stage: ApplicationStage): Promise<ApplicationStage>;
  async update(
    stageId: string,
    updates: Partial<ApplicationStage>
  ): Promise<void>;
  async delete(stageId: string): Promise<void>;
  async countByType(applicationId: string, type: StageType): Promise<number>;
}
```

### Business Rules Validation

```typescript
const STAGE_LIMITS: Record<StageType, number> = {
  submit_application: 1,
  ai_interview: 1,
  under_review: 1,
  assignment: 3,
  live_interview: 3,
  offer: 1,
  offer_accepted: 1,
  disqualified: 1,
};

async function validateBusinessRules(
  applicationId: string,
  stageType: StageType
): Promise<void> {
  const existingCount = await stageRepo.countByType(applicationId, stageType);
  const maxAllowed = STAGE_LIMITS[stageType];

  if (existingCount >= maxAllowed) {
    throw new BusinessRuleError(
      `Maximum ${maxAllowed} ${stageType} stages allowed. Current: ${existingCount}`
    );
  }
}
```

### Status Transition Rules

```typescript
const VALID_TRANSITIONS: Record<StageStatus, StageStatus[]> = {
  pending: ['in_progress', 'awaiting_candidate', 'skipped'],
  awaiting_candidate: ['in_progress', 'skipped'],
  in_progress: ['awaiting_recruiter', 'completed', 'skipped'],
  awaiting_recruiter: ['in_progress', 'completed', 'skipped'],
  completed: [], // Cannot transition from completed
  skipped: [], // Cannot transition from skipped
};

function validateTransition(
  currentStatus: StageStatus,
  newStatus: StageStatus
): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidTransitionError(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

1. **StageService.createStage**
   - ✅ Creates stage successfully
   - ✅ Throws error if max stages exceeded
   - ✅ Throws error if invalid stage type
   - ✅ Creates timeline event
   - ✅ Updates application.stages array

2. **StageService.updateStageStatus**
   - ✅ Updates status successfully
   - ✅ Throws error for invalid transition
   - ✅ Updates timestamps correctly
   - ✅ Creates timeline event

3. **StageService.getVisibleStages**
   - ✅ Candidate sees only visible stages
   - ✅ Recruiter sees all stages
   - ✅ Returns stages in correct order

4. **Business Rule Validation**
   - ✅ Enforces max 3 assignments
   - ✅ Enforces max 3 live interviews
   - ✅ Allows only 1 offer
   - ✅ Prevents duplicate submit_application

### Integration Tests

1. **Complete Stage Lifecycle**
   - Create → Update Status → Add Data → Complete
   - Verify database state at each step
   - Verify timeline events created

2. **Concurrent Updates**
   - Two users update same stage simultaneously
   - Verify optimistic locking works
   - Verify no data loss

3. **Transaction Rollback**
   - Simulate failure during stage creation
   - Verify no partial data persisted
   - Verify application state unchanged

4. **Performance Testing**
   - Create 20 stages for one application
   - Query all stages (<10ms)
   - Update stage status (<5ms)

---

## 🚨 Error Handling

### Custom Error Types

```typescript
class StageNotFoundError extends Error {}
class InvalidTransitionError extends Error {}
class BusinessRuleError extends Error {}
class UnauthorizedError extends Error {}
class MaxStagesExceededError extends BusinessRuleError {}
```

### Error Response Format

```typescript
{
  code: 'MAX_STAGES_EXCEEDED',
  message: 'Maximum 3 assignment stages allowed',
  details: {
    stageType: 'assignment',
    currentCount: 3,
    maxAllowed: 3
  }
}
```

---

## 📊 Validation Checklist

Before marking this story complete:

- [ ] All 8 tasks completed
- [ ] StageService implemented with all methods
- [ ] ApplicationStageRepository implemented
- [ ] tRPC procedures created and tested
- [ ] Unit tests: 85%+ coverage
- [ ] Integration tests: all workflows passing
- [ ] Error handling: all edge cases covered
- [ ] API documentation complete
- [ ] Code reviewed and approved
- [ ] No TypeScript errors
- [ ] All linting rules passing

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

- [x] `src/data-access/repositories/applicationStageRepo.ts` (269 lines, 15 methods)
- [x] `src/services/stageService.ts` (407 lines, 12+ methods)
- [x] `src/services/trpc/stageRouter.ts` (470 lines, 8 procedures)
- [x] `src/services/__tests__/stageService.test.ts` (650+ lines, 50+ tests)
- [x] `src/utils/applicationHelpers.ts` (380+ lines, 20+ helper functions)
- [ ] `__tests__/integration/stageService.integration.test.ts`

**Modified Files:**

- [x] `src/shared/types/applicationStage.ts` (added applicationId, createdBy, updatedBy)
- [x] `src/shared/types/application.ts` (updated ApplicationTimelineEvent for custom statuses)
- [x] `src/data-access/repositories/applicationRepo.ts` (added updateCurrentStage method)
- [x] `src/services/trpc/appRouter.ts` (added stageRouter to app router)
- [x] `src/utils/stageValidation.ts` (extended validations with business rules)

### Change Log

**2025-01-27 - Tasks 1-2 Complete**

- Created ApplicationStageRepository with 15 methods (269 lines)
  - CRUD: findById, findByApplicationId, create, update, delete
  - Queries: findByType, findActiveStage, findPendingStages, countByType, getMaxOrder, findByStatus
  - Advanced: findVisibleStages (role-based), bulkUpdate, atomic updateStatus
- Created StageService with comprehensive business logic (407 lines)
  - Core Methods: createStage, updateStageStatus, addStageData, getActiveStage, getStagesByApplicationId, getStagesByType, getNextPendingStage, canProgressToStage, getVisibleStages, deleteStage, getStageStats
  - Business Rules: STAGE_LIMITS (max 3 assignments/interviews), validateBusinessRules
  - Validation: VALID_TRANSITIONS state machine, validateStatusTransition
  - Custom Errors: StageNotFoundError, InvalidTransitionError, BusinessRuleError, MaxStagesExceededError, ApplicationDisqualifiedError
  - Integration: TimelineService for audit events, ApplicationRepository for state sync
- Enhanced type system:
  - ApplicationStage: Added applicationId, createdBy, updatedBy fields
  - ApplicationTimelineEvent: Changed status to `ApplicationStatus | string`, added metadata field
- Extended ApplicationRepository with updateCurrentStage method
- All code compiles with 0 TypeScript errors
- Applied Prettier formatting

**2025-01-27 - Task 3 Complete**

- Created tRPC Stage Router (470 lines, 8 procedures)
  - Procedures: create, updateStatus, addData, list, getActive, getByType, getStats, delete
  - Security: ownsApplication middleware validates user access (candidate or recruiter)
  - Input Validation: Zod schemas for all procedures (CreateStageSchema, UpdateStageStatusSchema, etc.)
  - Authorization: Role-based checks (only recruiters can create/delete stages)
  - Error Handling: Comprehensive try-catch with logging for all operations
  - Integration: Uses StageService for business logic, ApplicationRepo for ownership verification
- Added stageRouter to appRouter
  - Accessible via `trpc.stages.*` on frontend
  - All procedures protected with authentication + ownership middleware
- All code compiles with 0 TypeScript errors
- Applied Prettier formatting

**2025-01-27 - Task 4 Complete**

- Enhanced stageValidation.ts with advanced validation functions (~330 new lines)
  - Added STAGE_LIMITS constant (max stages by type: 3 assignments, 3 interviews, etc.)
  - validateBusinessRules: Checks stage count limits with detailed error messages
  - validateStageOrder: Ensures sequential order, first stage is submit_application, terminal stages last
  - validateRequiredFields: Type-specific field validation for each stage type (7 stage types)
    - Common fields: id, applicationId, type, order, status, createdBy
    - Completed assignment: requires title, description, sentAt, submittedAt, answerUrl
    - Completed live_interview: requires scheduledTime, completedAt, durationMinutes
    - Completed offer: requires sentAt, offerLetterUrl, response, respondedAt
    - And more for all stage types
  - validateStageCreation: Comprehensive validation combining business rules, stage order, transitions
  - validateStageCompletion: Validates stage has all required data before marking complete
  - All functions return ValidationResult with detailed error arrays
- All code compiles with 0 TypeScript errors
- Applied Prettier formatting

**2025-01-27 - Task 5 Complete**

- Created comprehensive unit tests for StageService (650+ lines, 50+ test cases)
  - Test Suites: createStage, updateStageStatus, addStageData, getActiveStage, getStagesByApplicationId, getStagesByType, getVisibleStages, deleteStage, canProgressToStage, getStageStats, getNextPendingStage, Business Rule Validation
  - CRUD Operations: All create, read, update, delete operations tested
  - Error Handling: StageNotFoundError, InvalidTransitionError, MaxStagesExceededError, ApplicationDisqualifiedError
  - Business Rules: Max 3 assignments, max 3 interviews, max 1 offer, max 1 submit_application
  - Status Transitions: Tested all valid and invalid transitions (pending→in_progress, in_progress→completed, completed→pending blocked)
  - Role-Based Filtering: Candidate vs recruiter visibility tested
  - Edge Cases: Empty arrays, null values, disqualified applications, completed stages
  - Mocking: Full repository and service layer mocked with vitest
  - All tests pass successfully
- All code compiles with 0 TypeScript errors
- Applied Prettier formatting

**2025-01-27 - Task 7 Complete**

- Created applicationHelpers.ts utility module (380+ lines, 20+ functions)
  - Core Lookups: getStageById, getCurrentStage, getStagesByType
  - Stage Filtering: getCompletedStages, getPendingStages, getVisibleStages, getSortedStages
  - Navigation: getNextPendingStage, getFirstStage, getLastStage
  - Progress Tracking: getApplicationProgress (0-100%), getApplicationDuration, getApplicationDurationDays
  - Status Checks: isApplicationActive, isApplicationComplete, hasStageType, isAwaitingCandidate, isAwaitingRecruiter
  - Statistics: getStageStatusCounts (total, pending, inProgress, completed, skipped, awaiting)
  - Summary: getApplicationStageSummary (comprehensive application state overview)
  - All functions handle empty/undefined stages gracefully
  - Utility-based approach (not class methods) for flexibility
- All code compiles with 0 TypeScript errors
- Applied Prettier formatting

---

## 📝 Dev Notes

- This story is the foundation for all UI features in Sprint 2-4
- Focus on comprehensive validation - prevents data integrity issues later
- TimelineService integration ensures full audit trail
- Consider caching frequently accessed stages (optimization for later)
- Repository layer enables easy testing with mocks

---

## 🔗 Related Stories

- **Story 5.1**: Core Stage Data Model (dependency)
- **Story 5.3**: Timeline UI Component (depends on this)
- **Story 5.4**: Assignment Stage Implementation (depends on this)
- **Story 5.5**: Live Interview Stage (depends on this)

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
