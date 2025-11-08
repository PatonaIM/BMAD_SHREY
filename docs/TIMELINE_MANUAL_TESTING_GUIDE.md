# Timeline Manual Testing Guide - Step by Step

**Date**: November 8, 2025  
**Component**: Timeline System (Sprint 3)  
**Estimated Time**: 30-45 minutes

---

## 🎯 Prerequisites

Before you start testing:

- [ ] Development server running: `npm run dev`
- [ ] MongoDB connected and accessible
- [ ] At least one recruiter account with `recruiterAccess: true`
- [ ] At least one candidate account (regular user)
- [ ] At least one application in the database

---

## 📋 Test Suite

### Test 1: Verify Timeline Displays on Recruiter Application Page (5 min)

**Objective**: Confirm timeline is integrated and rendering

**Steps**:

1. **Login as Recruiter**

   ```
   Navigate to: http://localhost:3000/login
   Login with recruiter account (user with recruiterAccess: true)
   ```

2. **Navigate to Application Detail**

   ```
   Go to: http://localhost:3000/recruiter/jobs/[jobId]/applications
   Click on any application card
   OR directly visit: http://localhost:3000/recruiter/applications/[applicationId]
   ```

3. **Verify Timeline Section Exists**
   - [ ] Look for "Timeline" heading in the page
   - [ ] Timeline card should be visible below the application details
   - [ ] Timeline should be in a white card with border (dark mode: dark background)

4. **Check Initial State**
   - [ ] If application has no timeline events: Should see "No timeline events yet"
   - [ ] If application has events: Should see date-grouped timeline
   - [ ] Filter button should be visible (top right)
   - [ ] Refresh button should be visible (if onRefresh prop passed)

**Expected Result**: ✅ Timeline section visible and rendering correctly

**Troubleshooting**:

- If timeline not visible: Check if TimelineView component imported in page
- If "No timeline events": Application might not have timeline data yet (expected for new apps)

---

### Test 2: Create Timeline Events via Status Change (10 min)

**Objective**: Verify timeline events are created when application status changes

**Steps**:

1. **Check Current Application Status**

   ```
   On application detail page, note the current status badge
   (e.g., "SUBMITTED", "UNDER REVIEW", etc.)
   ```

2. **Trigger Status Change (Method A: UI - If status change UI exists)**

   ```
   Look for status dropdown or status change button
   Change status from current → different status
   ```

3. **Trigger Status Change (Method B: Database Direct)**

   ```bash
   # Open MongoDB Compass or mongosh
   # Find your application
   db.applications.findOne({ _id: ObjectId("YOUR_APPLICATION_ID") })

   # Update status and add timeline event
   db.applications.updateOne(
     { _id: ObjectId("YOUR_APPLICATION_ID") },
     {
       $set: {
         status: "under_review",
         updatedAt: new Date()
       },
       $push: {
         timeline: {
           timestamp: new Date(),
           status: "under_review",
           actorType: "system",
           note: "Status changed to under review"
         }
       }
     }
   )
   ```

4. **Refresh Page and Verify**
   - [ ] Refresh browser (or click refresh button if available)
   - [ ] Timeline should now show the new event
   - [ ] Event should display:
     - Status badge (colored)
     - Timestamp (relative time like "2 minutes ago")
     - Actor type indicator
     - Note (if provided)

**Expected Result**: ✅ Timeline event appears after status change

---

### Test 3: Test Role-Based Filtering (CRITICAL SECURITY TEST) (15 min)

**Objective**: Verify RECRUITER sees all events, CANDIDATE sees only candidate/system events

**Steps**:

1. **Create Test Events with Different Actor Types**

   ```bash
   # In MongoDB Compass or mongosh
   # Add multiple events to your test application

   db.applications.updateOne(
     { _id: ObjectId("YOUR_APPLICATION_ID") },
     {
       $set: {
         timeline: [
           {
             timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
             status: "submitted",
             actorType: "system",
             note: "Application submitted via web portal"
           },
           {
             timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
             status: "ai_interview",
             actorType: "system",
             note: "AI interview completed"
           },
           {
             timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
             status: "under_review",
             actorType: "recruiter",
             actorId: "RECRUITER_USER_ID",
             note: "RECRUITER INTERNAL NOTE: Strong candidate, recommend next round"
           },
           {
             timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
             status: "interview_scheduled",
             actorType: "system",
             note: "Interview scheduled for next week"
           }
         ]
       }
     }
   )
   ```

2. **Test as RECRUITER**

   ```
   - Ensure logged in as recruiter (recruiterAccess: true)
   - Navigate to: /recruiter/applications/[applicationId]
   - Count visible timeline events
   ```

   **Verify RECRUITER View**:
   - [ ] Should see ALL 4 events
   - [ ] Should see "system" events (application submitted, AI interview)
   - [ ] Should see "recruiter" event with internal note
   - [ ] Should see all notes including recruiter-only notes

   **Expected**: 4 events visible

3. **Test as CANDIDATE (Currently No Candidate View - Expected Behavior)**

   ```
   - Logout recruiter account
   - Login as candidate (regular user without recruiterAccess)
   - Navigate to: /applications/[applicationId] (if candidate view exists)
   ```

   **Current Status**:
   - Candidate application detail page not yet implemented
   - This is EXPECTED and not a bug
   - Security filter exists in backend, ready for when candidate view is built

   **To Test Backend Filtering (Optional - Requires Dev Tools)**:

   ```javascript
   // In browser console on candidate session
   // Call tRPC endpoint directly
   fetch(
     '/api/trpc/recruiter.getTimeline?input=' +
       encodeURIComponent(
         JSON.stringify({
           json: { applicationId: 'YOUR_APPLICATION_ID' },
         })
       ),
     {
       credentials: 'include',
     }
   )
     .then(r => r.json())
     .then(data => {
       console.log('Candidate sees events:', data.result.data.json.timeline);
       // Should only see system and candidate events (no recruiter events)
     });
   ```

4. **Verify Security in Code (Alternative)**
   ```
   Since candidate view doesn't exist yet, verify security in code:
   - Open: src/services/timelineService.ts
   - Check getTimelineForRole function (line ~23)
   - Confirm: role === 'CANDIDATE' filters to actorType system/candidate only
   - Confirm: RECRUITER/ADMIN see all events
   ```

**Expected Result**:

- ✅ RECRUITER sees all events (4 events)
- ✅ CANDIDATE would see only 3 events (no recruiter internal note) - when view is built
- ✅ Code review confirms server-side filtering is secure

---

### Test 4: Test Date Grouping and Relative Time (5 min)

**Objective**: Verify events are grouped by date with proper relative timestamps

**Steps**:

1. **Verify Date Grouping**
   - [ ] Events from today should be under "Today" header
   - [ ] Events from yesterday should be under "Yesterday" header
   - [ ] Older events should show full date (e.g., "November 5, 2025")

2. **Check Relative Time Display**
   - [ ] Recent events show "X minutes ago" or "X hours ago"
   - [ ] Events from yesterday show "1 day ago"
   - [ ] Older events show "X days ago"
   - [ ] Verify timestamps update correctly (use date-fns)

3. **Test with Multiple Days**
   ```
   If your test application only has events from one day:
   - Use MongoDB to add events with different timestamps (see Test 3 example)
   - Events should auto-group by date
   ```

**Expected Result**: ✅ Events grouped by date with accurate relative time

---

### Test 5: Test Dark Mode (3 min)

**Objective**: Verify timeline renders correctly in dark mode

**Steps**:

1. **Toggle Dark Mode**

   ```
   - Look for dark mode toggle in UI (usually top right)
   - OR use system preference: System Preferences → Appearance → Dark
   - OR browser DevTools: Toggle prefers-color-scheme
   ```

2. **Verify Dark Mode Rendering**
   - [ ] Timeline card has dark background (dark:bg-gray-800)
   - [ ] Text is readable (white/light gray)
   - [ ] Date headers visible (dark:text-gray-400)
   - [ ] Event cards have proper contrast
   - [ ] Status badges readable in dark mode
   - [ ] Icons visible (not too dark or too light)
   - [ ] Border colors appropriate (dark:border-gray-700)

**Expected Result**: ✅ Timeline fully functional and readable in dark mode

---

### Test 6: Test Mobile Responsive (5 min)

**Objective**: Verify timeline works on mobile viewport

**Steps**:

1. **Open Chrome DevTools**

   ```
   Press F12 or Cmd+Option+I (Mac)
   Click "Toggle Device Toolbar" icon (or Cmd+Shift+M)
   ```

2. **Test Different Viewports**
   - [ ] iPhone SE (375px width)
     - Timeline should fit without horizontal scroll
     - Text wraps properly
     - Event icons not cut off
   - [ ] iPad (768px width)
     - Timeline uses available space
     - Layout looks good
   - [ ] Desktop (1920px width)
     - Timeline doesn't stretch too wide
     - Proper max-width applied

3. **Test Touch Interactions (if applicable)**
   - [ ] Tap to expand events (if expandable)
   - [ ] Filter button accessible
   - [ ] Touch targets ≥44px (easy to tap)

**Expected Result**: ✅ Timeline fully responsive, no horizontal scroll

---

### Test 7: Test Empty States and Edge Cases (3 min)

**Objective**: Verify graceful handling of edge cases

**Steps**:

1. **Test Empty Timeline**

   ```bash
   # In MongoDB, remove all timeline events
   db.applications.updateOne(
     { _id: ObjectId("YOUR_APPLICATION_ID") },
     { $set: { timeline: [] } }
   )
   ```

   **Verify**:
   - [ ] Should show "No timeline events yet" message
   - [ ] Should show helpful empty state UI
   - [ ] No JavaScript errors in console

2. **Test with 50+ Events (Performance)**

   ```bash
   # Add many events
   db.applications.updateOne(
     { _id: ObjectId("YOUR_APPLICATION_ID") },
     {
       $set: {
         timeline: Array.from({ length: 50 }, (_, i) => ({
           timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
           status: "under_review",
           actorType: "system",
           note: `Event ${i + 1}`
         }))
       }
     }
   )
   ```

   **Verify**:
   - [ ] Page loads without lag
   - [ ] Scrolling is smooth
   - [ ] Date grouping still works
   - [ ] No performance warnings in console

3. **Test Invalid Application ID**

   ```
   Navigate to: /recruiter/applications/invalid-id-123
   ```

   **Verify**:
   - [ ] Should show 404 or error page
   - [ ] No unhandled exceptions
   - [ ] Error message is user-friendly

**Expected Result**: ✅ All edge cases handled gracefully

---

### Test 8: Test Filter Functionality (If Implemented) (5 min)

**Objective**: Verify timeline filters work (if UI implemented)

**Note**: Filter UI is implemented but not fully wired yet (as per code review)

**Steps**:

1. **Click Filter Button**
   - [ ] Filter button visible (top right of timeline)
   - [ ] Currently placeholder - clicking may not do anything yet

2. **Check Filter State Management**

   ```
   Open React DevTools → Components → TimelineView
   Check state:
   - selectedStatuses: []
   - selectedActors: []
   ```

3. **Future Test (When Filters Fully Implemented)**
   - [ ] Filter by status (submitted, under_review, etc.)
   - [ ] Filter by actor type (system, recruiter, candidate)
   - [ ] Clear filters button works
   - [ ] Empty state when no matches

**Expected Result**: ⏳ Filter button present but not yet functional (as designed)

---

## ✅ Test Results Checklist

Mark each test as you complete it:

- [ ] Test 1: Timeline displays on recruiter page ✅
- [ ] Test 2: Timeline events created on status change ✅
- [ ] Test 3: Role-based filtering secure (recruiter sees all, candidate filtered) ✅
- [ ] Test 4: Date grouping and relative time working ✅
- [ ] Test 5: Dark mode renders correctly ✅
- [ ] Test 6: Mobile responsive (375px viewport) ✅
- [ ] Test 7: Empty states and edge cases handled ✅
- [ ] Test 8: Filter UI present (functionality pending) ⏳

---

## 🐛 Issue Tracker

Document any issues found during testing:

| Test #  | Issue Description      | Severity | Status |
| ------- | ---------------------- | -------- | ------ |
| Example | Timeline not rendering | High     | Fixed  |
|         |                        |          |        |

---

## 📊 Test Summary

After completing all tests, fill out:

**Total Tests**: 8  
**Tests Passed**: **\_  
**Tests Failed**: \_**  
**Issues Found**: \_\_\_

**Overall Status**: ⬜ Pass | ⬜ Pass with Minor Issues | ⬜ Fail

**Tester Name**: **\*\***\_\_\_**\*\***  
**Date Completed**: **\*\***\_\_\_**\*\***  
**Environment**: Local Development

---

## 🚀 Quick Start Commands

For copy-paste convenience:

```bash
# Start dev server
npm run dev

# Open application in browser
open http://localhost:3000

# Connect to MongoDB (if needed)
mongosh "$MONGODB_URI"

# View application collection
db.applications.find().pretty()

# Add test timeline event (replace YOUR_APPLICATION_ID)
db.applications.updateOne(
  { _id: ObjectId("YOUR_APPLICATION_ID") },
  {
    $push: {
      timeline: {
        timestamp: new Date(),
        status: "under_review",
        actorType: "system",
        note: "Test event from manual testing"
      }
    }
  }
)
```

---

## 📝 Notes Section

Use this space for observations:

- Timeline loading speed: **\*\***\_\_\_**\*\***
- Any UI glitches noticed: **\*\***\_\_\_**\*\***
- Browser tested: **\*\***\_\_\_**\*\***
- Screen resolution: **\*\***\_\_\_**\*\***
- Additional comments: **\*\***\_\_\_**\*\***

---

## ✅ Sign-Off

Once all tests pass:

**Timeline Integration Testing**: ✅ COMPLETE

**Approved By**: **\*\***\_\_\_**\*\***  
**Date**: **\*\***\_\_\_**\*\***  
**Ready for**: Sprint 4 Development

---

**END OF MANUAL TESTING GUIDE**
