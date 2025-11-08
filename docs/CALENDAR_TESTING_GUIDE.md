# Google Calendar Integration - Testing Guide

## 📋 Overview

This guide walks you through testing the Google Calendar scheduling feature implemented in Sprint 4 Days 4-5.

**What You're Testing**:

- OAuth2 authentication with Calendar scopes
- Creating calendar events with Google Meet links
- Sending email invites to candidates
- Viewing scheduled calls
- Updating call status
- Timeline integration

---

## 🚀 Prerequisites

### 1. Environment Setup

Ensure your `.env.local` has:

```bash
# Google OAuth (should already exist)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth (should already exist)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key

# MongoDB (should already exist)
MONGODB_URI=mongodb://localhost:27017/teammatch
```

### 2. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services > OAuth consent screen**
4. Ensure these scopes are added:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`

5. Navigate to **APIs & Services > Credentials**
6. Edit your OAuth 2.0 Client ID
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Start Development Server

```bash
cd /Users/shrey/projects/bmad-shrey
npm run dev
```

Server should start at `http://localhost:3000`

---

## 🧪 Test Scenarios

### Test 1: OAuth Re-authentication (Calendar Permissions)

**Purpose**: Verify Google OAuth requests Calendar scopes

**Steps**:

1. **Sign out** if already logged in:
   - Navigate to `http://localhost:3000`
   - Click your profile → Sign Out

2. **Clear existing session** (important!):
   - Open browser DevTools (F12)
   - Application/Storage tab → Clear all cookies for `localhost:3000`
   - Or use Incognito/Private window

3. **Sign in with Google**:
   - Click "Sign In with Google"
   - Select your Google account
   - **Expected**: You should see permission request screen asking for:
     - ✅ View your email address
     - ✅ View your basic profile info
     - ✅ **See, edit, share, and permanently delete all calendars**
     - ✅ **View and edit events on all your calendars**

4. **Grant permissions**:
   - Click "Allow"
   - You should be redirected back to the app

**✅ Pass Criteria**:

- Permission screen shows Calendar scopes
- No errors during OAuth flow
- Successfully signed in

**❌ Common Issues**:

- **"Access blocked"**: Add your email to test users in Google Cloud Console
- **Missing Calendar scopes**: Check `src/auth/options.ts` has correct scopes
- **Redirect error**: Verify redirect URI in Google Cloud Console matches

---

### Test 2: View Scheduled Calls Dashboard

**Purpose**: Verify SchedulingPanel component loads

**Steps**:

1. **Navigate to recruiter page**:

   ```
   http://localhost:3000/recruiter
   ```

2. **Find an existing application** (or create a test application):
   - Go to Applications tab
   - Click on any application

3. **Look for "Scheduled Interviews" section**:
   - Should be visible on the application detail page
   - Initially shows "No scheduled interviews found"

**✅ Pass Criteria**:

- SchedulingPanel component renders
- Status filter tabs visible (ALL, SCHEDULED, COMPLETED, etc.)
- Empty state displays properly

**❌ Common Issues**:

- Component not rendering: Check if SchedulingPanel is imported in application detail page
- TypeScript errors: Run `npm run type-check` to verify compilation

---

### Test 3: Schedule a New Interview

**Purpose**: End-to-end scheduling flow

**Steps**:

1. **Open scheduling modal**:
   - On an application detail page
   - Click "Schedule Interview" button
   - Modal should open

2. **Fill in scheduling form**:
   - **Date**: Select tomorrow's date (or any future date)
   - **Time**: Select 10:00 AM (or any time)
   - **Duration**: Keep default 30 minutes
   - **Notes** (optional): "Technical interview - round 1"

3. **Submit the form**:
   - Click "Schedule Interview"
   - Should show "Scheduling..." loading state

4. **Verify success**:
   - Alert/toast should show: "Interview scheduled successfully!"
   - Should display Google Meet link
   - Modal should close
   - New scheduled call should appear in list

**✅ Pass Criteria**:

- Form validation works (can't select past dates)
- Loading state shows during submission
- Success message with Meet link appears
- New call appears in scheduled list
- Status badge shows "SCHEDULED"

**❌ Common Issues**:

- **"Google Calendar access token not found"**: Re-authenticate with Google (sign out and back in)
- **API error**: Check browser console and server logs for details
- **No Meet link**: Check `googleCalendarService.ts` createEvent implementation
- **Modal doesn't close**: Check useScheduling hook error handling

---

### Test 4: Verify Google Calendar Event

**Purpose**: Confirm event created in Google Calendar

**Steps**:

1. **Open Google Calendar**:
   - Go to [Google Calendar](https://calendar.google.com/)
   - Use the same Google account you authenticated with

2. **Find the scheduled event**:
   - Navigate to the date/time you scheduled
   - Look for event with title: "Interview: [Job Title] - [Candidate Email]"

3. **Verify event details**:
   - ✅ Correct date and time
   - ✅ Correct duration
   - ✅ Google Meet link present (click to verify it opens)
   - ✅ Candidate email in attendees list
   - ✅ Notes in description (if you added any)

4. **Check candidate's email** (if you have access):
   - Candidate should receive email invite
   - Email should have calendar attachment (.ics file)
   - Email should include Google Meet link

**✅ Pass Criteria**:

- Event appears in Google Calendar
- All details match what you entered
- Meet link is clickable and opens Google Meet
- Candidate email is in attendees

**❌ Common Issues**:

- **Event not created**: Check server logs for API errors
- **No Meet link**: Verify conferenceData is enabled in API call
- **Candidate not invited**: Check email address in application record
- **Wrong timezone**: Check server timezone settings

---

### Test 5: Filter Scheduled Calls

**Purpose**: Verify status filtering works

**Steps**:

1. **With at least one scheduled call**:
   - Go to SchedulingPanel component

2. **Test each filter tab**:
   - Click "ALL" → Should show all calls
   - Click "SCHEDULED" → Should show only scheduled calls
   - Click "COMPLETED" → Should show only completed calls (empty if none)
   - Click "CANCELLED" → Should show only cancelled calls (empty if none)

3. **Verify active tab styling**:
   - Active tab should have blue background
   - Inactive tabs should have gray background

**✅ Pass Criteria**:

- Each filter shows correct subset of calls
- Tab styling changes on click
- Empty states show for filters with no results

---

### Test 6: Update Call Status

**Purpose**: Verify status updates work

**Steps**:

1. **Mark interview as completed** (for past interviews):
   - Find a scheduled call where the date/time has passed
   - Should see "Mark Complete" and "No Show" buttons
   - Click "Mark Complete"
   - Status should change to "COMPLETED"
   - Badge should turn green

2. **Cancel future interview**:
   - Find a scheduled call in the future
   - Should see "Cancel" button
   - Click "Cancel"
   - Status should change to "CANCELLED"
   - Badge should turn red

3. **Verify persistence**:
   - Refresh the page
   - Status changes should persist
   - Check MongoDB to verify status updated

**✅ Pass Criteria**:

- Status updates immediately (optimistic update)
- Badge color changes correctly
- Updates persist after refresh
- Timeline event created for status change

---

### Test 7: Timeline Integration

**Purpose**: Verify scheduling creates timeline events

**Steps**:

1. **Schedule a new interview** (following Test 3)

2. **Navigate to application timeline**:
   - On the same application detail page
   - Scroll to Timeline section

3. **Verify timeline event**:
   - Should see new event: "Scheduled interview for [date/time]"
   - Event type should be "interview_scheduled"
   - Actor should be your recruiter name
   - Timestamp should be recent

4. **Update call status** (following Test 6)

5. **Check timeline again**:
   - Should see new event: "Interview completed" or "Interview cancelled"
   - Timestamp should be most recent

**✅ Pass Criteria**:

- Timeline events created for scheduling
- Timeline events created for status updates
- Events show correct actor and timestamp
- Timeline orders events chronologically

---

### Test 8: Error Handling

**Purpose**: Verify graceful error handling

**Steps**:

1. **Test with expired OAuth token**:
   - Wait ~1 hour after authentication
   - Try to schedule an interview
   - Should either:
     - Auto-refresh token and succeed
     - Or show error: "Please re-authenticate with Google"

2. **Test with invalid date**:
   - Try to schedule for a past date
   - Form validation should prevent submission

3. **Test with missing application**:
   - In browser console, try calling tRPC with invalid applicationId
   - Should return proper error message

4. **Test network failure**:
   - Open DevTools → Network tab
   - Throttle to "Offline"
   - Try to schedule interview
   - Should show error message
   - Go back online
   - Retry should work

**✅ Pass Criteria**:

- Errors show user-friendly messages
- No unhandled exceptions in console
- App remains functional after errors
- Token refresh happens automatically

---

### Test 9: Mobile Responsiveness

**Purpose**: Verify mobile UI works

**Steps**:

1. **Open Chrome DevTools**:
   - Press F12
   - Click device toolbar icon (or Cmd/Ctrl + Shift + M)

2. **Test at 375px width** (iPhone SE):
   - Navigate to SchedulingPanel
   - Verify layout doesn't break
   - Filter tabs should scroll horizontally if needed
   - Call cards should stack vertically
   - Action buttons should be readable

3. **Test CallScheduler modal**:
   - Open scheduling modal
   - Form should be readable on small screen
   - Date/time pickers should work
   - Submit button should be visible

**✅ Pass Criteria**:

- No horizontal scrolling (except filter tabs)
- All text is readable
- Buttons are tappable (not too small)
- Modal fits on screen
- Forms are usable

---

### Test 10: Performance Check

**Purpose**: Verify acceptable performance

**Steps**:

1. **Check initial load time**:
   - Open DevTools → Network tab
   - Refresh page
   - Verify SchedulingPanel loads in <2 seconds

2. **Check scheduling API response**:
   - Open DevTools → Network tab
   - Schedule an interview
   - Find `scheduleCall` request
   - Verify response time <3 seconds

3. **Check query caching**:
   - Schedule an interview
   - Navigate away and back
   - Calls should load instantly (from cache)

**✅ Pass Criteria**:

- Initial load <2s
- API calls <3s
- Query caching works
- No unnecessary re-fetches

---

## 🐛 Troubleshooting

### Issue: "Cannot find module './CallScheduler'"

**Solution**: Restart TypeScript server

```bash
# In VS Code: Cmd/Ctrl + Shift + P
# Type: "TypeScript: Restart TS Server"
```

### Issue: "Google Calendar access token not found"

**Solution**: Re-authenticate with Google

1. Sign out completely
2. Clear browser cookies
3. Sign in again with Google
4. Grant Calendar permissions

### Issue: "Failed to create calendar event"

**Solution**: Check OAuth scopes

1. Verify `src/auth/options.ts` has correct scopes
2. Check Google Cloud Console OAuth consent screen
3. Re-authenticate after adding scopes

### Issue: Events not appearing in Google Calendar

**Solution**: Check Calendar API is enabled

1. Go to Google Cloud Console
2. Navigate to APIs & Services → Library
3. Search for "Google Calendar API"
4. Click "Enable" if not already enabled

### Issue: MongoDB connection error

**Solution**: Verify MongoDB is running

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Or if using local MongoDB
mongosh --eval "db.version()"
```

---

## 📊 Test Checklist

Use this checklist to track your testing progress:

- [ ] **Test 1**: OAuth re-authentication with Calendar scopes
- [ ] **Test 2**: SchedulingPanel component renders
- [ ] **Test 3**: Schedule new interview end-to-end
- [ ] **Test 4**: Verify event in Google Calendar
- [ ] **Test 5**: Status filtering works
- [ ] **Test 6**: Update call status
- [ ] **Test 7**: Timeline integration
- [ ] **Test 8**: Error handling
- [ ] **Test 9**: Mobile responsiveness
- [ ] **Test 10**: Performance check

### Additional Verification

- [ ] Check server logs for errors
- [ ] Check browser console for errors
- [ ] Verify MongoDB records created
- [ ] Test with multiple candidates
- [ ] Test with different timezones
- [ ] Test cancelling and rescheduling

---

## 🎯 Success Criteria Summary

**All tests should demonstrate**:

✅ **Functionality**:

- Calendar events created successfully
- Meet links generated and clickable
- Email invites sent to candidates
- Status updates work correctly
- Timeline events created

✅ **User Experience**:

- Smooth OAuth flow
- Clear error messages
- Loading states during async operations
- Responsive design on mobile
- Intuitive UI

✅ **Technical**:

- No compilation errors
- No runtime errors in console
- API responses <3 seconds
- Data persists correctly in MongoDB
- Token refresh works automatically

---

## 📝 Reporting Issues

If you find bugs, document:

1. **What you were doing**: Exact steps to reproduce
2. **What you expected**: Expected behavior
3. **What happened**: Actual behavior
4. **Environment**: Browser, OS, screen size
5. **Logs**: Browser console errors, server logs
6. **Screenshots**: If relevant

Example bug report:

```
Bug: Calendar event not created

Steps:
1. Signed in as recruiter
2. Navigated to application ABC123
3. Clicked "Schedule Interview"
4. Filled date: 2024-01-15, time: 10:00
5. Clicked "Schedule Interview"

Expected: Event created in Google Calendar
Actual: Error "Failed to create calendar event"

Environment: Chrome 120, macOS 14.1
Console Error: "Invalid OAuth token"
Server Log: [attached]
```

---

## 🚀 Ready to Test!

Start with **Test 1** and work through sequentially. Each test builds on the previous one.

Good luck! 🎉
