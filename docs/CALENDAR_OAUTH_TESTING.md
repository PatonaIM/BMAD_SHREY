# Separate Calendar OAuth - Testing Guide

## Prerequisites

### 1. Google Cloud Console Setup

Before testing, ensure your OAuth configuration is correct:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services > Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", ensure you have:
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000/api/auth/calendar-callback
   ```
6. Click **Save**
7. Wait 1-2 minutes for changes to propagate

### 2. Environment Check

Verify your `.env.local` has:

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
MONGODB_URI=mongodb://localhost:27017/teammatch
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
```

### 3. Start Services

```bash
# Terminal 1: Start MongoDB (if using Docker)
docker-compose up -d

# Terminal 2: Start development server
npm run dev
```

---

## Test Suite

### Test 1: Verify Calendar Scopes Removed from Default OAuth ✅

**Purpose**: Confirm new users don't see Calendar permissions during sign-in

**Steps**:

1. Sign out if currently logged in
2. Clear browser cookies and cache:
   - Chrome: DevTools → Application → Clear storage
   - Or use Incognito/Private window
3. Go to `http://localhost:3000`
4. Click "Sign In with Google"
5. **Expected**: Permission screen shows ONLY:
   - ✅ View your email address
   - ✅ View your basic profile info
   - ❌ NO Calendar permissions
6. Cancel or complete sign-in

**✅ Pass Criteria**: Calendar permissions NOT shown during initial OAuth

---

### Test 2: CalendarConnection Component Appears ✅

**Purpose**: Verify the Calendar connection UI is visible to recruiters

**Steps**:

1. Sign in as a recruiter account
2. Navigate to `http://localhost:3000/recruiter`
3. Look for "Google Calendar Integration" card near the top

**Expected**:

- Card is visible above the job subscription tabs
- Shows calendar icon and title
- Shows status: "Not Connected" with gray X icon
- Shows "Connect Google Calendar" button
- Shows feature list (4 bullet points)

**✅ Pass Criteria**: Component renders correctly with all elements visible

---

### Test 3: Connect Calendar - Happy Path ✅

**Purpose**: Test successful Calendar connection flow

**Steps**:

1. On recruiter dashboard, click **"Connect Google Calendar"** button
2. **Expected**: Redirected to Google OAuth consent screen
3. **Verify**: Permission request shows:
   - ✅ See, edit, share, and permanently delete all calendars
   - ✅ View and edit events on all your calendars
4. Click **"Allow"**
5. **Expected**: Redirected back to `/recruiter?calendar_connected=true`
6. **Verify**:
   - Green success banner: "Google Calendar connected successfully!"
   - Status changes to "Connected" with green checkmark
   - Shows connection date
   - Shows token expiry date (future date)
   - Shows "Disconnect" and "Reconnect" buttons

**✅ Pass Criteria**:

- OAuth flow completes without errors
- Success message displayed
- Status shows as connected

---

### Test 4: Verify Tokens Stored in Database ✅

**Purpose**: Confirm tokens are saved in MongoDB

**Steps**:

1. After successful connection (Test 3)
2. Open MongoDB Compass or mongosh
3. Connect to `mongodb://localhost:27017/teammatch`
4. Run query:
   ```javascript
   db.users.findOne({ email: 'your-recruiter-email@gmail.com' });
   ```

**Expected Document Structure**:

```json
{
  "_id": "uuid-string",
  "email": "your-recruiter@gmail.com",
  "roles": ["RECRUITER"],
  "googleCalendar": {
    "accessToken": "ya29.a0AfB_...", // Long string
    "refreshToken": "1//0gw...", // Long string
    "expiresAt": 1730000000000, // Unix timestamp
    "scope": "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
    "connectedAt": "2024-11-08T12:34:56.789Z" // ISO date
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

**✅ Pass Criteria**:

- `googleCalendar` field exists
- All required fields present (accessToken, refreshToken, expiresAt, scope, connectedAt)
- Tokens are long strings (100+ chars)
- expiresAt is a future timestamp

---

### Test 5: Recruiter Schedule Interview (With Connected Calendar) ✅

**Purpose**: Test scheduling works with database-stored tokens

**Steps**:

1. Ensure Calendar is connected (Test 3)
2. Navigate to `/recruiter/applications/{applicationId}`
3. Scroll to "Scheduled Interviews" section
4. Click **"Schedule Interview"** button
5. Fill in form:
   - Date: Tomorrow
   - Time: 2:00 PM
   - Duration: 30 minutes
   - Notes: "Technical interview - testing"
6. Click **"Schedule Interview"**

**Expected**:

- Success message appears
- Google Meet link displayed
- Call appears in list with "SCHEDULED" badge
- No error about missing Calendar tokens

**Verify in Google Calendar**:

1. Open [Google Calendar](https://calendar.google.com/)
2. Navigate to scheduled date/time
3. Event should exist with:
   - Title: "Interview: [Job Title] - [Candidate Email]"
   - Google Meet link
   - Correct duration

**✅ Pass Criteria**:

- Interview scheduled successfully
- No token-related errors
- Event created in Google Calendar

---

### Test 6: Candidate View Available Slots (With Recruiter Calendar) ✅

**Purpose**: Test candidate can see slots when recruiter has Calendar connected

**Prerequisites**:

- Recruiter has Calendar connected (Test 3)
- Candidate has completed AI interview

**Steps**:

1. Sign in as candidate
2. Navigate to `/applications/{applicationId}` (where interview is complete)
3. Verify "Schedule Follow-up Call" section visible
4. Verify eligibility shows "Ready to Schedule Your Follow-up Call"
5. Click **"View Available Times"**

**Expected**:

- Loading spinner appears
- Available slots load successfully
- Shows dates with available slots
- Can click date to see time slots
- Shows recruiter name
- Shows timezone information

**✅ Pass Criteria**:

- Slots load without errors
- No "Recruiter Calendar Not Connected" warning
- Can select date and time

---

### Test 7: Candidate Book Time Slot ✅

**Purpose**: Test end-to-end candidate booking flow

**Prerequisites**:

- Recruiter has Calendar connected
- Candidate viewing available slots (Test 6)

**Steps**:

1. Select a date from available slots
2. Select a time slot
3. Add notes (optional): "Looking forward to discussing my experience"
4. Click **"Confirm Booking"**
5. Wait for success screen

**Expected**:

- Confirmation screen shows selected date/time
- Shows timezone
- Success screen appears with:
  - Green checkmark
  - "Interview Scheduled Successfully!"
  - Calendar details with Meet link
  - "Join Meet Call" button
  - "What Happens Next" checklist

**Verify**:

- Check Google Calendar (recruiter's calendar)
- Event should be created with candidate as attendee
- Meet link should match what's shown in UI

**✅ Pass Criteria**:

- Booking completes successfully
- No errors about missing tokens
- Event appears in Google Calendar

---

### Test 8: Disconnect Calendar ✅

**Purpose**: Test disconnection removes tokens and disables scheduling

**Steps**:

1. Sign in as recruiter
2. Go to `/recruiter` dashboard
3. Find "Google Calendar Integration" card
4. Verify status shows "Connected"
5. Click **"Disconnect"** button
6. Confirm dialog: "Are you sure...?"
7. Click OK/Confirm

**Expected**:

- Success message: "Calendar disconnected successfully"
- Page may reload
- Status changes to "Not Connected" with gray X
- "Connect Google Calendar" button appears
- Feature list reappears

**Verify in Database**:

```javascript
db.users.findOne({ email: 'your-recruiter@gmail.com' });
```

- `googleCalendar` field should NOT exist

**Test Scheduling Disabled**:

1. Try to schedule an interview
2. **Expected**: Error message: "Google Calendar not connected. Please connect your calendar first."

**✅ Pass Criteria**:

- Tokens removed from database
- Status shows disconnected
- Scheduling blocked with clear error

---

### Test 9: Candidate Booking Without Recruiter Calendar ✅

**Purpose**: Test error handling when recruiter hasn't connected Calendar

**Prerequisites**:

- Recruiter has Calendar DISCONNECTED (Test 8)
- Candidate has completed AI interview

**Steps**:

1. Sign in as candidate
2. Navigate to `/applications/{applicationId}`
3. Click **"View Available Times"**

**Expected**:

- Shows yellow warning card:
  - ⚠️ Icon
  - "Unable to Load Available Times"
  - Message about recruiter not connecting Calendar
  - "Go Back" button

**Alternative**: If error is caught earlier:

- May show error immediately
- Should have user-friendly message

**✅ Pass Criteria**:

- Clear error message displayed
- No technical error details exposed
- User can navigate back

---

### Test 10: Reconnect Calendar ✅

**Purpose**: Test reconnection after disconnecting

**Steps**:

1. After disconnecting (Test 8)
2. On recruiter dashboard
3. Click **"Connect Google Calendar"** again
4. Go through OAuth flow
5. Grant permissions

**Expected**:

- OAuth flow completes
- New tokens stored in database
- Status shows "Connected"
- Can schedule interviews again

**Verify**:

- New `googleCalendar` object in database
- New timestamps for `connectedAt` and `expiresAt`
- Scheduling works immediately

**✅ Pass Criteria**:

- Can reconnect after disconnecting
- All features work after reconnection

---

### Test 11: Multiple Recruiters ✅

**Purpose**: Verify each recruiter has independent Calendar connection

**Steps**:

1. Sign in as Recruiter A
2. Connect Calendar
3. Verify connected status
4. Sign out
5. Sign in as Recruiter B
6. Check Calendar status

**Expected**:

- Recruiter B shows "Not Connected"
- Each recruiter has separate connection state

**Test Cross-Recruiter**:

1. Recruiter A: Connected
2. Recruiter B: Not connected
3. Both subscribe to same job
4. Candidate applies
5. Candidate tries to book slot

**Expected**:

- Should use Recruiter A's Calendar (first subscription)
- OR show error if system requires all recruiters connected

**✅ Pass Criteria**:

- Each recruiter's connection is independent
- Tokens are per-user in database

---

### Test 12: URL Parameters Cleanup ✅

**Purpose**: Verify OAuth callback parameters are cleaned from URL

**Steps**:

1. Connect Calendar successfully
2. **Initial URL**: `/recruiter?calendar_connected=true`
3. Wait 2 seconds
4. Check browser URL bar

**Expected**:

- URL automatically changes to `/recruiter`
- Parameters removed from history
- Success banner still visible

**✅ Pass Criteria**:

- URL cleaned automatically
- Browser back button doesn't go back to param URL

---

### Test 13: Error Scenarios ✅

#### Test 13A: OAuth Cancel

1. Click "Connect Calendar"
2. On Google permission screen, click **"Cancel"**
3. **Expected**: Redirected to `/recruiter?calendar_error=access_denied`
4. Shows red error banner

#### Test 13B: Invalid User

- Manually modify state parameter in OAuth URL
- Complete OAuth
- **Expected**: Error "invalid_user"

#### Test 13C: Token Exchange Failure

- Requires manually breaking OAuth (rare)
- **Expected**: Error "token_exchange_failed"

**✅ Pass Criteria**: All errors show user-friendly messages

---

### Test 14: Token Expiry Display ✅

**Purpose**: Verify token expiry is displayed correctly

**Steps**:

1. Connect Calendar
2. Check "Connection Details" section
3. Note "Token Expires" date

**Expected**:

- Shows future date (1 hour from connection)
- Green color for valid tokens
- Red color for expired tokens (test by modifying DB)

**To Test Expired State**:

```javascript
// In MongoDB
db.users.updateOne(
  { email: 'your-recruiter@gmail.com' },
  { $set: { 'googleCalendar.expiresAt': Date.now() - 1000 } }
);
```

- Refresh page
- "Token Expires" should show red

**✅ Pass Criteria**: Expiry date displayed with correct color coding

---

### Test 15: Mobile Responsiveness ✅

**Purpose**: Verify Calendar connection UI works on mobile

**Steps**:

1. Open DevTools (F12)
2. Toggle device toolbar (Cmd/Ctrl + Shift + M)
3. Select iPhone SE (375px)
4. Navigate to `/recruiter`

**Expected**:

- Calendar connection card is readable
- Buttons are tappable (not too small)
- No horizontal scrolling
- Text wraps appropriately
- Feature list stacks vertically

**✅ Pass Criteria**: All elements usable on small screens

---

## Quick Test Checklist

Use this for rapid validation:

- [ ] New user sign-in: NO Calendar permissions shown
- [ ] CalendarConnection component visible on `/recruiter`
- [ ] "Connect Calendar" button works
- [ ] OAuth flow completes successfully
- [ ] Tokens stored in database (`googleCalendar` field)
- [ ] Status shows "Connected" with green checkmark
- [ ] Recruiter can schedule interviews (no token errors)
- [ ] Candidate can view available slots
- [ ] Candidate can book time slot
- [ ] Events appear in Google Calendar with Meet links
- [ ] "Disconnect" button removes tokens
- [ ] Scheduling blocked after disconnect
- [ ] Can reconnect after disconnecting
- [ ] Error handling works (try without Calendar)

---

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch"

**Solution**: Add `http://localhost:3000/api/auth/calendar-callback` to Google Cloud Console OAuth redirect URIs

### Issue: "Unauthorized" when clicking Connect

**Solution**: Sign out and sign back in to get fresh session

### Issue: Tokens not in database

**Solution**:

- Check MongoDB connection
- Check server logs for errors
- Verify callback route executed

### Issue: "Calendar not connected" error when scheduling

**Solution**:

- Verify tokens exist in database
- Check `googleCalendar.expiresAt` is future date
- Try reconnecting Calendar

### Issue: No slots available for candidate

**Solution**:

- Verify recruiter has connected Calendar
- Check recruiter's Google Calendar has free time
- Check date range (next 14 days)

---

## Performance Benchmarks

- Calendar connection OAuth flow: < 5 seconds
- Token storage in DB: < 500ms
- Available slots query: < 2 seconds
- Book slot (create Calendar event): < 3 seconds

---

## Security Verification

- [ ] Tokens encrypted in database (check if using encryption)
- [ ] Tokens not exposed in API responses
- [ ] Tokens not logged in server logs
- [ ] Calendar scopes only requested when user clicks Connect
- [ ] User can disconnect anytime
- [ ] Tokens removed from DB on disconnect

---

## Testing Complete! 🎉

Once all tests pass, the separate Calendar OAuth feature is ready for production!

**Next Steps**:

1. Test with real Google account
2. Verify email invitations sent to candidates
3. Test calendar sync across devices
4. Monitor for any OAuth errors in production
