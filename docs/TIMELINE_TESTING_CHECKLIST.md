# Timeline Integration Manual Testing Checklist

**Date**: November 8, 2025  
**Sprint**: Sprint 3 - Timeline Integration (Days 4-5)  
**Status**: Testing In Progress

---

## 🎯 Test Objectives

1. ✅ Verify role-based timeline filtering (CANDIDATE vs RECRUITER)
2. ✅ Ensure no security leaks (candidates cannot see recruiter-only events)
3. ✅ Test timeline UI rendering (date grouping, icons, relative time)
4. ✅ Validate event creation and display
5. ✅ Confirm dark mode and mobile responsive design

---

## 📋 Test Cases

### Test 1: Role-Based Filtering (CRITICAL SECURITY TEST)

**Objective**: Verify CANDIDATE users only see candidate/system events, RECRUITER users see all

**Prerequisites**:

- Active application with timeline events
- Both candidate and recruiter user accounts

**Test Steps**:

1. **As RECRUITER**:
   - [ ] Login with recruiter account (recruiterAccess: true)
   - [ ] Navigate to `/recruiter/applications/[applicationId]`
   - [ ] Verify timeline displays ALL events including:
     - System events (actorType: 'system')
     - Recruiter events (actorType: 'recruiter')
     - Candidate events (actorType: 'candidate')
   - [ ] Expected: All timeline events visible

2. **As CANDIDATE** (if candidate view exists):
   - [ ] Login with candidate account
   - [ ] Navigate to application detail page
   - [ ] Verify timeline displays ONLY:
     - System events (actorType: 'system')
     - Candidate events (actorType: 'candidate')
   - [ ] Expected: Recruiter-only events NOT visible

3. **Backend API Test**:

   ```bash
   # Test recruiter role
   curl -X POST http://localhost:3000/api/trpc/recruiter.getTimeline \
     -H "Content-Type: application/json" \
     -d '{"applicationId": "YOUR_APP_ID"}'

   # Verify response includes all events
   ```

**Expected Results**:

- ✅ RECRUITER sees all events (system, recruiter, candidate)
- ✅ CANDIDATE sees only system + candidate events (recruiter events filtered)
- ✅ No 500 errors, no unauthorized access

**Security Validation**:

- [ ] Recruiter feedback events NOT visible to candidate
- [ ] Internal recruiter notes NOT visible to candidate
- [ ] Profile sharing events NOT visible to candidate
- [ ] Status changes visible to both (system events)

---

### Test 2: Timeline Event Creation

**Objective**: Verify events can be created and appear immediately

**Test Steps**:

1. **Status Change Event**:
   - [ ] As recruiter, change application status from 'submitted' → 'under_review'
   - [ ] Verify new timeline event appears with:
     - Correct timestamp
     - actorType: 'system' or 'recruiter'
     - Status badge matches new status
   - [ ] Expected: Event visible immediately (optimistic update or refetch)

2. **Manual Event Addition (via tRPC)**:

   ```typescript
   // Test addTimelineEvent mutation
   await api.recruiter.addTimelineEvent.mutate({
     applicationId: 'YOUR_APP_ID',
     status: 'under_review',
     note: 'Candidate profile looks strong',
     actorType: 'recruiter',
     actorId: 'RECRUITER_USER_ID',
   });
   ```

   - [ ] Verify event appears in timeline
   - [ ] Verify timestamp is recent
   - [ ] Verify note displays correctly

3. **Automated System Events**:
   - [ ] Submit new application
   - [ ] Expected: 'submitted' event auto-created with actorType: 'system'
   - [ ] Complete AI interview
   - [ ] Expected: 'ai_interview' event auto-created

**Expected Results**:

- ✅ All event types create successfully
- ✅ Events appear in chronological order (newest first or oldest first based on UI design)
- ✅ No duplicate events
- ✅ Actor information correct (actorId, actorType)

---

### Test 3: Timeline UI Components

**Objective**: Verify TimelineView and TimelineEvent components render correctly

**Test Steps**:

1. **Date Grouping**:
   - [ ] Create events spanning multiple days
   - [ ] Verify events grouped by date sections
   - [ ] Verify date headers: "Today", "Yesterday", or full date
   - [ ] Example:

     ```
     Today
       - Status changed to Under Review (2 hours ago)
       - Feedback added (5 hours ago)

     Yesterday
       - Application submitted (1 day ago)
     ```

2. **Event Icons**:
   - [ ] Verify each event type has correct icon:
     - 'submitted': FileText icon
     - 'under_review': Clock icon
     - 'interview_scheduled': Calendar icon
     - 'offer': CheckCircle2 icon
     - 'rejected': AlertCircle icon
   - [ ] Icons should be color-coded by status

3. **Relative Time Display**:
   - [ ] Verify timestamps show relative time:
     - "2 minutes ago"
     - "3 hours ago"
     - "Yesterday"
     - "2 days ago"
   - [ ] Uses `date-fns` formatDistanceToNow

4. **Filtering (if implemented)**:
   - [ ] Test status filter dropdown
   - [ ] Test actor type filter (system/recruiter/candidate)
   - [ ] Verify filtered results update immediately

5. **Empty State**:
   - [ ] Remove all timeline events
   - [ ] Verify empty state displays:
     - Helpful message: "No timeline events yet"
     - Icon or illustration

6. **Loading State**:
   - [ ] Throttle network in DevTools
   - [ ] Verify loading skeleton or spinner displays
   - [ ] No layout shift when data loads

**Expected Results**:

- ✅ All visual elements render correctly
- ✅ Icons match event types
- ✅ Date grouping works
- ✅ Relative time accurate
- ✅ No visual bugs

---

### Test 4: Dark Mode

**Objective**: Verify timeline works in dark mode

**Test Steps**:

1. [ ] Toggle dark mode (system preference or manual toggle)
2. [ ] Verify timeline card has dark background
3. [ ] Verify text is readable (high contrast)
4. [ ] Verify event icons visible in dark mode
5. [ ] Verify status badges readable
6. [ ] Verify border colors appropriate for dark mode

**Expected Results**:

- ✅ All elements readable in dark mode
- ✅ No white flashes or contrast issues
- ✅ Consistent with rest of application dark mode

---

### Test 5: Mobile Responsive

**Objective**: Verify timeline works on mobile devices

**Test Steps**:

1. [ ] Open Chrome DevTools, set viewport to iPhone SE (375px)
2. [ ] Verify timeline card scales correctly
3. [ ] Verify event icons not cut off
4. [ ] Verify text wraps properly (no horizontal scroll)
5. [ ] Verify touch targets ≥44px (buttons, expandable events)
6. [ ] Test on actual mobile device (iOS or Android)

**Expected Results**:

- ✅ Timeline fully functional on mobile
- ✅ No horizontal scroll
- ✅ All text readable
- ✅ Touch targets adequate

---

### Test 6: Performance

**Objective**: Verify timeline performs well with many events

**Test Steps**:

1. [ ] Create application with 50+ timeline events
2. [ ] Load application detail page
3. [ ] Measure Time to Interactive (Chrome DevTools Performance)
4. [ ] Expected: TTI < 3 seconds
5. [ ] Verify no jank when scrolling timeline
6. [ ] Check React DevTools Profiler for unnecessary re-renders

**Expected Results**:

- ✅ Page loads quickly even with many events
- ✅ Smooth scrolling
- ✅ No performance warnings in console

---

### Test 7: Error Handling

**Objective**: Verify graceful error handling

**Test Steps**:

1. [ ] Test with invalid applicationId
   - Expected: Error message displayed, no crash
2. [ ] Test with user lacking permissions
   - Expected: 403 Unauthorized error
3. [ ] Test with MongoDB connection failure (mock)
   - Expected: Error boundary catches, shows fallback UI
4. [ ] Test addTimelineEvent with invalid data
   - Expected: Validation error, helpful message

**Expected Results**:

- ✅ No unhandled exceptions
- ✅ User-friendly error messages
- ✅ No console errors in normal operation

---

## 🔧 Manual Testing Script

Run this script to create test data:

```typescript
// scripts/create-timeline-test-data.ts
import { ApplicationRepository } from '../src/data-access/repositories/applicationRepo';

async function createTestTimeline() {
  const appRepo = new ApplicationRepository();

  // Find or create test application
  const testApp = await appRepo.findById('YOUR_TEST_APP_ID');

  if (!testApp) {
    console.error('Test application not found');
    return;
  }

  // Create diverse timeline events
  const testEvents = [
    {
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'submitted' as const,
      actorType: 'system' as const,
      note: 'Application submitted via web portal',
    },
    {
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      status: 'ai_interview' as const,
      actorType: 'system' as const,
      note: 'AI interview completed with score 85/100',
    },
    {
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: 'under_review' as const,
      actorType: 'recruiter' as const,
      actorId: 'RECRUITER_USER_ID',
      note: 'Strong technical background, moving to next stage',
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'interview_scheduled' as const,
      actorType: 'recruiter' as const,
      actorId: 'RECRUITER_USER_ID',
      note: 'Phone screen scheduled for Monday 10am',
    },
  ];

  // Update application with timeline
  const collection = await appRepo['getCollection']();
  await collection.updateOne(
    { _id: testApp._id },
    {
      $set: {
        timeline: testEvents,
        updatedAt: new Date(),
      },
    }
  );

  console.log('✅ Test timeline data created successfully');
}

createTestTimeline().catch(console.error);
```

---

## ✅ Acceptance Criteria

Sprint 3 Timeline Integration is **COMPLETE** when:

- [x] Timeline displays on recruiter application detail page
- [ ] Role-based filtering works (CANDIDATE vs RECRUITER)
- [ ] No security leaks (candidates cannot see recruiter events)
- [ ] Events can be created via addTimelineEvent mutation
- [ ] Timeline groups events by date
- [ ] Relative time displays correctly
- [ ] Icons and status badges render properly
- [ ] Dark mode works correctly
- [ ] Mobile responsive (≥375px viewport)
- [ ] No console errors or warnings
- [ ] Performance acceptable (<3s TTI)

---

## 🐛 Known Issues

_(Document any issues found during testing)_

- None yet

---

## 📊 Test Results Summary

| Test Case            | Status | Notes |
| -------------------- | ------ | ----- |
| Role-Based Filtering | ⏳     |       |
| Event Creation       | ⏳     |       |
| UI Components        | ⏳     |       |
| Dark Mode            | ⏳     |       |
| Mobile Responsive    | ⏳     |       |
| Performance          | ⏳     |       |
| Error Handling       | ⏳     |       |

**Legend**: ⏳ Pending | ✅ Passed | ❌ Failed | ⚠️ Issues Found

---

## 📝 Testing Notes

_(Add testing observations here)_

**Date**: November 8, 2025
**Tester**: [Your Name]
**Environment**: Local Development

### Observations:

- Timeline already integrated into recruiter application detail page (/recruiter/applications/[id])
- TimelineService implements role-based filtering (CANDIDATE vs RECRUITER logic)
- TimelineView component exists with 178 lines (date grouping, filtering, icons)
- TimelineEvent component exists with 143 lines (event rendering with status colors)
- Backend tRPC endpoint `recruiter.getTimeline` handles role detection
- No candidate-facing timeline view exists yet (only recruiter view)

### Next Steps:

1. Execute manual tests with real user sessions
2. Verify role-based filtering with actual candidate login
3. Test event creation through UI actions
4. Validate security (no data leaks)
5. Mark Sprint 3 complete after all tests pass
