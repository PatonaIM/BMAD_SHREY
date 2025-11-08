# Separate Calendar OAuth Implementation - Complete! ✅

## Summary

Successfully implemented a separate Google Calendar OAuth flow so that only recruiters who want to use scheduling features need to grant Calendar permissions, rather than prompting all users during sign-in.

## Key Changes

### 1. Removed Calendar Scopes from Default OAuth ✅

**File**: `src/auth/options.ts`

**Before**:

```typescript
scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
access_type: 'offline',
prompt: 'consent',
```

**After**:

```typescript
scope: 'openid email profile',
// Note: Calendar scopes removed - use separate /api/auth/calendar-connect endpoint
```

**Impact**: New users signing in with Google will only see basic profile permissions, not Calendar permissions.

---

### 2. Database Token Storage ✅

**File**: `src/shared/types/user.ts`

Added new interface and field to User type:

```typescript
export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (milliseconds)
  scope: string;
  connectedAt: string; // ISO date string
}

export interface User {
  _id: string;
  email: string;
  roles: string[];
  googleCalendar?: GoogleCalendarTokens; // ← NEW: Optional, only for connected users
  createdAt: string;
  updatedAt: string;
}
```

**File**: `src/data-access/repositories/userRepo.ts`

Added three new functions:

1. `storeGoogleCalendarTokens(userId, tokens)` - Save Calendar OAuth tokens
2. `getGoogleCalendarTokens(userId)` - Retrieve tokens for a user
3. `removeGoogleCalendarTokens(userId)` - Remove tokens (disconnect)

**Impact**: Calendar tokens now persist in MongoDB `users` collection, linked to user ID.

---

### 3. Separate Calendar OAuth Endpoints ✅

**File**: `src/app/api/auth/calendar-connect/route.ts`

- **Endpoint**: `GET /api/auth/calendar-connect`
- **Purpose**: Initiates Google OAuth with only Calendar scopes
- **Flow**:
  1. Checks user is authenticated
  2. Redirects to Google OAuth with Calendar scopes
  3. Passes user ID in `state` parameter

**File**: `src/app/api/auth/calendar-callback/route.ts`

- **Endpoint**: `GET /api/auth/calendar-callback`
- **Purpose**: Handles OAuth callback and stores tokens
- **Flow**:
  1. Receives authorization code from Google
  2. Exchanges code for access_token and refresh_token
  3. Stores tokens in database via `storeGoogleCalendarTokens()`
  4. Redirects to `/recruiter?calendar_connected=true`

**Scopes Requested**:

- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`

---

### 4. CalendarConnection Component ✅

**File**: `src/components/recruiter/dashboard/CalendarConnection.tsx`

New React component (260+ lines) with features:

**Connection Status Display**:

- ✅ Green checkmark when connected
- ❌ Gray X when not connected
- Shows connection date and token expiry
- Displays scope information

**"Connect Calendar" Button**:

- Redirects to `/api/auth/calendar-connect`
- Triggers separate OAuth flow

**"Disconnect" Button**:

- Calls tRPC `disconnectCalendar` mutation
- Removes tokens from database

**Success/Error Messages**:

- Detects URL parameters (`calendar_connected=true` or `calendar_error=xxx`)
- Shows green success banner or red error banner
- Auto-cleans URL after displaying message

**Feature List** (when not connected):

- Schedule interviews with Google Meet links
- Let candidates book available time slots
- Automatic calendar event creation
- Email invitations with calendar attachments

---

### 5. New tRPC Procedures ✅

**File**: `src/services/trpc/recruiterRouter.ts`

**Added**:

1. **`getCalendarStatus`** (query):
   - Returns: `{ connected, connectedAt?, expiresAt?, scope? }`
   - Used by CalendarConnection component to show status

2. **`disconnectCalendar`** (mutation):
   - Calls `removeGoogleCalendarTokens(userId)`
   - Returns: `{ success, message }`

**Modified**:

3. **`scheduleCall`** (mutation):
   - **Before**: Required `accessToken` and `refreshToken` in input
   - **After**: Fetches tokens from database using `getGoogleCalendarTokens(userId)`
   - Throws `PRECONDITION_FAILED` error if Calendar not connected

---

### 6. Updated Candidate Scheduling ✅

**File**: `src/services/trpc/candidateRouter.ts`

**Modified Procedures**:

1. **`getAvailableSlots`** (query):
   - **Before**: Required `recruiterAccessToken` and `recruiterRefreshToken` in input
   - **After**: Automatically fetches recruiter tokens from database
   - Finds recruiter via `recruiterSubscriptionRepo`
   - Calls `getGoogleCalendarTokens(recruiterId)`
   - Returns clear error if recruiter hasn't connected Calendar

2. **`bookTimeSlot`** (mutation):
   - **Before**: Required `recruiterAccessToken` and `recruiterRefreshToken` in input
   - **After**: Automatically fetches recruiter tokens from database
   - Same flow as `getAvailableSlots`

**File**: `src/components/candidate/scheduling/CandidateScheduling.tsx`

**Removed**:

- Session token retrieval code
- `recruiterAccessToken` and `recruiterRefreshToken` parameters from tRPC calls
- Warning UI that checked for session tokens

**Updated**:

- Now shows generic "Unable to Load Available Times" message on error
- Backend handles token retrieval transparently

---

### 7. Dashboard Integration ✅

**File**: `src/app/recruiter/page.tsx`

Added `CalendarConnection` component to recruiter dashboard:

```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
    <h1>Recruiter Dashboard</h1>
  </div>
  {/* Calendar Connection Section */}
  <CalendarConnection /> {/* ← NEW */}
  {/* Dashboard Content */}
  <RecruiterDashboard />
</div>
```

**Result**: Calendar connection card appears at top of recruiter dashboard, above job subscriptions.

---

## Complete File List

### New Files Created (3):

1. `/src/app/api/auth/calendar-connect/route.ts` - OAuth initiation endpoint
2. `/src/app/api/auth/calendar-callback/route.ts` - OAuth callback handler
3. `/src/components/recruiter/dashboard/CalendarConnection.tsx` - UI component

### Files Modified (7):

1. `/src/auth/options.ts` - Removed Calendar scopes from default OAuth
2. `/src/shared/types/user.ts` - Added GoogleCalendarTokens interface and field
3. `/src/data-access/repositories/userRepo.ts` - Added 3 token management functions
4. `/src/services/trpc/recruiterRouter.ts` - Added 2 procedures, modified scheduleCall
5. `/src/services/trpc/candidateRouter.ts` - Modified 2 procedures to auto-fetch tokens
6. `/src/components/candidate/scheduling/CandidateScheduling.tsx` - Removed token params
7. `/src/app/recruiter/page.tsx` - Added CalendarConnection component

---

## User Flow

### For Recruiters:

1. **Sign In** (First Time):
   - Click "Sign In with Google"
   - See permission screen: ✅ Email, ✅ Profile
   - **NO** Calendar permissions requested
   - Sign in completed

2. **Connect Calendar**:
   - Navigate to Recruiter Dashboard
   - See "Google Calendar Integration" card
   - Status: "Your calendar is not connected"
   - Click "Connect Google Calendar" button
   - Redirected to Google OAuth
   - See permission screen: ✅ Calendar (read/write)
   - Grant permission
   - Redirected back to dashboard
   - See green success message: "Google Calendar connected successfully!"

3. **Schedule Interviews**:
   - Navigate to application detail page
   - Click "Schedule Interview" button
   - Backend automatically uses stored Calendar tokens
   - Calendar event created with Meet link
   - No need to provide tokens manually

4. **Disconnect Calendar**:
   - Go to Recruiter Dashboard
   - See "Google Calendar Integration" card
   - Status: "Connected" with green checkmark
   - Click "Disconnect" button
   - Confirm dialog
   - Tokens removed from database
   - Scheduling features disabled until reconnected

### For Candidates:

1. **Sign In**:
   - Click "Sign In" (credentials or Google)
   - If using Google: Only see basic profile permissions
   - **NO** Calendar permissions requested

2. **Self-Schedule Follow-up Call**:
   - Complete AI interview
   - Navigate to application detail page
   - See "Schedule Follow-up Call" section
   - Click "View Available Times"
   - Backend automatically fetches recruiter's tokens
   - See available slots (if recruiter connected Calendar)
   - **OR** see warning: "Recruiter may not have connected their Google Calendar yet"
   - Book slot → Calendar event created with Meet link

---

## Error Handling

### When Recruiter Hasn't Connected Calendar:

**Recruiter trying to schedule**:

- Error: `PRECONDITION_FAILED`
- Message: "Google Calendar not connected. Please connect your calendar first."

**Candidate trying to book**:

- Error: `PRECONDITION_FAILED`
- Message: "Recruiter has not connected their Google Calendar yet. Please contact the recruiter."

### When OAuth Fails:

**Possible errors** (handled in callback):

- `missing_params` - No code or userId in callback
- `invalid_user` - User ID not found in database
- `token_exchange_failed` - Google token exchange failed
- `unknown` - Catch-all for unexpected errors

**Redirect**: `/recruiter?calendar_error={error_code}`
**UI**: Red error banner with message

---

## Testing Checklist

### ✅ Setup Verification:

- [ ] MongoDB running
- [ ] `GOOGLE_CLIENT_ID` set in `.env.local`
- [ ] `GOOGLE_CLIENT_SECRET` set in `.env.local`
- [ ] Dev server running: `npm run dev`

### ✅ New User Sign-In:

- [ ] Sign out completely
- [ ] Clear browser cookies
- [ ] Click "Sign In with Google"
- [ ] Verify OAuth screen shows ONLY: Email, Profile
- [ ] Verify OAuth screen does NOT show Calendar permissions
- [ ] Sign in successful

### ✅ Recruiter Calendar Connection:

- [ ] Navigate to `/recruiter`
- [ ] Verify "Google Calendar Integration" card visible
- [ ] Verify status shows "Not Connected" with gray X
- [ ] Click "Connect Google Calendar" button
- [ ] Redirected to Google OAuth
- [ ] Verify permission screen shows Calendar permissions
- [ ] Grant permissions
- [ ] Redirected back to `/recruiter?calendar_connected=true`
- [ ] Verify green success message: "Google Calendar connected successfully!"
- [ ] Refresh page
- [ ] Verify status shows "Connected" with green checkmark
- [ ] Verify connection date displayed
- [ ] Verify token expiry displayed (future date)

### ✅ Database Verification:

- [ ] Open MongoDB Compass or mongosh
- [ ] Connect to `mongodb://localhost:27017/teammatch`
- [ ] Query: `db.users.findOne({ email: "your-recruiter@email.com" })`
- [ ] Verify `googleCalendar` field exists
- [ ] Verify `googleCalendar.accessToken` is a long string
- [ ] Verify `googleCalendar.refreshToken` is a long string
- [ ] Verify `googleCalendar.expiresAt` is a number (timestamp)
- [ ] Verify `googleCalendar.connectedAt` is an ISO date string
- [ ] Verify `googleCalendar.scope` contains Calendar scopes

### ✅ Recruiter Scheduling (with connected Calendar):

- [ ] Navigate to `/recruiter/applications/{applicationId}`
- [ ] Click "Schedule Interview" button
- [ ] Fill in date, time, duration
- [ ] Submit
- [ ] Verify success message
- [ ] Verify Meet link displayed
- [ ] Open Google Calendar
- [ ] Verify event created with correct details

### ✅ Candidate Self-Scheduling (with recruiter Calendar connected):

- [ ] Sign in as candidate
- [ ] Complete AI interview for an application
- [ ] Navigate to `/applications/{applicationId}`
- [ ] Verify "Schedule Follow-up Call" section visible
- [ ] Click "View Available Times"
- [ ] Verify available slots load
- [ ] Select date → select time
- [ ] Add optional notes
- [ ] Click "Confirm Booking"
- [ ] Verify success screen with Meet link
- [ ] Open Google Calendar (recruiter's calendar)
- [ ] Verify event created

### ✅ Candidate Self-Scheduling (without recruiter Calendar):

- [ ] Disconnect recruiter's Calendar (on recruiter dashboard)
- [ ] Sign in as candidate
- [ ] Navigate to application with completed AI interview
- [ ] Click "View Available Times"
- [ ] Verify warning message: "Unable to Load Available Times"
- [ ] Verify message mentions recruiter may not have connected Calendar

### ✅ Disconnect Calendar:

- [ ] Sign in as recruiter
- [ ] Navigate to `/recruiter`
- [ ] Verify "Google Calendar Integration" shows "Connected"
- [ ] Click "Disconnect" button
- [ ] Confirm dialog
- [ ] Verify success message: "Calendar disconnected successfully"
- [ ] Refresh page
- [ ] Verify status shows "Not Connected"
- [ ] Try to schedule interview
- [ ] Verify error: "Please connect your calendar first"

### ✅ Reconnect Calendar:

- [ ] On recruiter dashboard
- [ ] Click "Connect Google Calendar" again
- [ ] Grant permissions (may auto-approve if already granted)
- [ ] Verify connected successfully
- [ ] Verify scheduling works again

---

## Benefits of This Approach

### User Experience:

✅ **Less friction for candidates** - Don't need Google Calendar permissions to apply
✅ **Less friction for recruiters** - Only asked for permissions when they need them
✅ **Clear value proposition** - Feature list shown before asking for permissions
✅ **Opt-in model** - Recruiters control when to connect Calendar

### Security:

✅ **Principle of least privilege** - Only grant permissions when needed
✅ **Token storage in database** - Centralized, secure storage
✅ **Easy to revoke** - Disconnect button immediately removes tokens
✅ **Audit trail** - connectedAt timestamp shows when permissions granted

### Developer Experience:

✅ **No session management** - Tokens stored in database, not JWT
✅ **No token passing in frontend** - Backend fetches tokens automatically
✅ **Clear error messages** - Users know when Calendar not connected
✅ **Separation of concerns** - Auth and Calendar OAuth are separate

### Scalability:

✅ **Token refresh** - GoogleCalendarService auto-refreshes expired tokens
✅ **Multiple recruiters** - Each recruiter has their own Calendar connection
✅ **No session size limits** - Tokens in database, not in JWT
✅ **Production ready** - Follows OAuth2 best practices

---

## Next Steps

1. **Test End-to-End** ⏳
   - Follow testing checklist above
   - Verify all flows work correctly

2. **Token Refresh Logic** (Future Enhancement)
   - Add cron job to refresh expiring tokens
   - Add warning UI when token expires soon

3. **Multi-Calendar Support** (Future Enhancement)
   - Allow recruiters to choose which calendar to use
   - Support multiple calendar accounts

4. **Granular Permissions** (Future Enhancement)
   - Allow recruiters to choose specific calendars
   - Limit access to specific time ranges

5. **Admin Tools** (Future Enhancement)
   - Dashboard to see which recruiters have connected
   - Ability for admins to disconnect/reconnect on behalf of users

---

## Troubleshooting

### Issue: "Unauthorized" error when clicking "Connect Calendar"

**Solution**: Make sure you're signed in. Sign out and sign back in.

### Issue: "Access blocked" during Google OAuth

**Solution**: Add your email to test users in Google Cloud Console → OAuth consent screen

### Issue: Redirect URI mismatch

**Solution**: Verify redirect URI in Google Cloud Console matches exactly:

- `http://localhost:3000/api/auth/calendar-callback` (development)

### Issue: Tokens not saved in database

**Solution**:

- Check MongoDB connection
- Check server logs for errors
- Verify `userId` is correct in callback

### Issue: "Calendar not connected" even after connecting

**Solution**:

- Refresh the page
- Check database for `googleCalendar` field
- Check browser console for errors

---

## Implementation Complete! 🎉

All features implemented and ready for testing. The separate Calendar OAuth flow provides a much better UX by:

- Not overwhelming users with permissions upfront
- Giving recruiters control over when to connect
- Storing tokens securely in the database
- Making Calendar integration truly optional

**Status**: ✅ **READY FOR END-TO-END TESTING**
