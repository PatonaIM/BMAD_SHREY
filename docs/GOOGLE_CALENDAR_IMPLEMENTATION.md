# Google Calendar Integration - Implementation Summary

## Overview

Google Calendar scheduling integration for Sprint 4 Days 4-5, enabling recruiters to schedule interviews with candidates via Google Meet.

## Status: ✅ COMPLETE

All backend services, tRPC procedures, and frontend components have been successfully implemented.

---

## Backend Components

### 1. GoogleCalendarService

**Location**: `/src/services/googleCalendarService.ts`

OAuth2-based Google Calendar API integration:

```typescript
// Create calendar event with Google Meet link
const result = await googleCalendarService.createEvent(
  accessToken,
  {
    title: 'Interview: Senior Developer - john@example.com',
    description: 'Interview details...',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T10:30:00'),
    attendees: ['john@example.com'],
  },
  refreshToken
);
// Returns: { success: true, data: { eventId, meetLink } }
```

**Features**:

- OAuth2Client with automatic token refresh
- Google Meet link generation
- Automatic email invites to attendees
- Free/busy time slot queries
- Circuit breaker pattern for graceful failures

### 2. scheduledCallRepo

**Location**: `/src/data-access/repositories/scheduledCallRepo.ts`

MongoDB repository for managing scheduled calls:

```typescript
// Create scheduled call
const call = await scheduledCallRepo.createScheduledCall({
  applicationId: '...',
  recruiterId: '...',
  candidateEmail: 'john@example.com',
  jobId: '...',
  scheduledAt: new Date(),
  duration: 30,
  meetLink: 'https://meet.google.com/abc-defg-hij',
  notes: 'Technical interview',
});
```

**Collections**:

- `scheduledCalls` - Main collection
- **Indexes**:
  - `recruiter_schedule` - (recruiterId, scheduledAt)
  - `application_calls` - (applicationId, scheduledAt)
  - `upcoming_calls` - (status, scheduledAt)

**Status Enum**: `scheduled`, `completed`, `cancelled`, `no_show`, `rescheduled`

### 3. tRPC Procedures

**Location**: `/src/services/trpc/recruiterRouter.ts`

Three new procedures added to recruiter router:

#### scheduleCall

```typescript
trpc.recruiter.scheduleCall.mutate({
  applicationId: '...',
  scheduledAt: '2024-01-15T10:00:00Z',
  duration: 30,
  notes: 'Technical interview',
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
});
// Returns: { success: true, callId, meetLink, message }
```

#### getScheduledCalls

```typescript
trpc.recruiter.getScheduledCalls.useQuery({
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
  status: 'scheduled', // optional filter
});
// Returns: { success: true, calls: [...] }
```

#### updateCallStatus

```typescript
trpc.recruiter.updateCallStatus.mutate({
  callId: '...',
  status: 'completed',
  notes: 'Great interview',
});
// Returns: { success: true, message }
```

### 4. NextAuth Configuration

**Location**: `/src/auth/options.ts`

Extended Google OAuth provider with Calendar scopes:

```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      scope:
        'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```

**Scopes**:

- `openid email profile` - Basic authentication
- `calendar.readonly` - Read calendar free/busy
- `calendar.events` - Create/modify events
- `access_type: offline` - Get refresh token
- `prompt: consent` - Always request permissions

---

## Frontend Components

### 1. useScheduling Hook

**Location**: `/src/hooks/useScheduling.ts`

React hook for scheduling operations:

```typescript
const {
  scheduleCall,
  scheduledCalls,
  isScheduling,
  isLoadingCalls,
  error,
  refreshCalls,
  updateCallStatus,
} = useScheduling({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  status: 'scheduled', // optional
});

// Schedule a call
const result = await scheduleCall({
  applicationId: '...',
  scheduledAt: new Date('2024-01-15T10:00:00'),
  duration: 30,
  notes: 'Technical interview',
});

// Update status
await updateCallStatus(callId, 'completed', 'Great interview!');
```

**Features**:

- Automatic session token handling
- Query caching (30s stale time)
- Optimistic updates with refetch
- Comprehensive error handling

### 2. SchedulingPanel Component

**Location**: `/src/components/recruiter/scheduling/SchedulingPanel.tsx`

Main scheduling interface:

```tsx
<SchedulingPanel applicationId={applicationId} />
```

**Features**:

- Status filter tabs (all, scheduled, completed, cancelled, no_show)
- Scheduled calls list with full details
- Action buttons:
  - **Past scheduled**: Mark Complete, No Show
  - **Future scheduled**: Cancel
- Google Meet link display
- Schedule interview button (opens CallScheduler modal)
- Can filter by specific application

**UI Elements**:

- Status badges with color coding
- Date/time formatting
- Duration display
- Optional notes display
- Meet link with target="\_blank"

### 3. CallScheduler Component

**Location**: `/src/components/recruiter/scheduling/CallScheduler.tsx`

Modal for creating new interviews:

```tsx
<CallScheduler
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  applicationId={applicationId}
/>
```

**Features**:

- Date picker (min: today)
- Time picker (24-hour format)
- Duration selector (15min, 30min, 45min, 1h, 1.5h, 2h)
- Optional notes textarea
- Loading state during scheduling
- Error display
- Success confirmation with Meet link
- Form reset after successful scheduling

---

## Integration Points

### Timeline Events

Scheduling actions create timeline events:

```typescript
await timelineService.addEvent(applicationId, {
  status: 'interview_scheduled',
  actorType: 'recruiter',
  actorId: userId,
  note: `Scheduled interview for ${scheduledAt.toLocaleString()}`,
});
```

Status updates also tracked:

```typescript
await timelineService.addEvent(applicationId, {
  status: 'under_review',
  actorType: 'recruiter',
  actorId: userId,
  note: `Interview ${status}${notes ? `: ${notes}` : ''}`,
});
```

### Notification System

**Future Integration** (Sprint 4 Days 2-3 already complete):

- Google Chat notifications for scheduled interviews
- Email notifications to candidates (via Google Calendar)
- Reminder notifications before interview starts

---

## Usage Examples

### Complete Flow: Scheduling an Interview

1. **Recruiter views application**:

```tsx
import { SchedulingPanel } from '@/components/recruiter/scheduling';

function ApplicationDetail({ applicationId }) {
  return (
    <div>
      <ApplicationInfo applicationId={applicationId} />
      <SchedulingPanel applicationId={applicationId} />
    </div>
  );
}
```

2. **Click "Schedule Interview"** - Opens CallScheduler modal

3. **Fill form**:
   - Date: 2024-01-15
   - Time: 10:00 AM
   - Duration: 30 minutes
   - Notes: "Technical interview round 1"

4. **Submit** - Hook calls tRPC mutation:

```typescript
const result = await scheduleCall({
  applicationId,
  scheduledAt: new Date('2024-01-15T10:00:00'),
  duration: 30,
  notes: 'Technical interview round 1',
});
```

5. **Backend flow**:
   - Get application details (candidate email, job title)
   - Create Google Calendar event with Meet link
   - Save to `scheduledCalls` collection
   - Add timeline event
   - Return Meet link to frontend

6. **Success**:
   - Modal shows Meet link
   - SchedulingPanel refreshes automatically
   - New call appears in "Scheduled" tab
   - Candidate receives email invite with calendar attachment

### Viewing Scheduled Calls

```tsx
import { SchedulingPanel } from '@/components/recruiter/scheduling';

// All scheduled calls for recruiter
<SchedulingPanel />

// Calls for specific application
<SchedulingPanel applicationId="abc123" />
```

### Updating Call Status

```tsx
const { updateCallStatus } = useScheduling();

// Mark as completed
await updateCallStatus(callId, 'completed', 'Great technical skills');

// Mark as no-show
await updateCallStatus(callId, 'no_show');

// Cancel future interview
await updateCallStatus(callId, 'cancelled', 'Candidate withdrew');
```

---

## Environment Variables

Required in `.env`:

```bash
# Google OAuth (already configured)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth (already configured)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# MongoDB (already configured)
MONGODB_URI=mongodb://localhost:27017/yourdb
```

**Note**: No additional environment variables needed for Calendar integration. Uses existing Google OAuth credentials.

---

## Testing Checklist

### Backend Tests

- [ ] GoogleCalendarService creates events successfully
- [ ] Meet links generated correctly
- [ ] Email invites sent to candidates
- [ ] OAuth token refresh works
- [ ] scheduledCallRepo CRUD operations work
- [ ] MongoDB indexes created correctly
- [ ] tRPC procedures require authentication
- [ ] Timeline events created on scheduling

### Frontend Tests

- [ ] useScheduling hook fetches calls correctly
- [ ] SchedulingPanel displays calls
- [ ] Status filtering works
- [ ] CallScheduler modal opens/closes
- [ ] Date/time validation works
- [ ] Scheduling mutation successful
- [ ] Meet link displayed after scheduling
- [ ] Error states handled gracefully
- [ ] Loading states shown appropriately

### Integration Tests

- [ ] End-to-end: Schedule interview from UI
- [ ] Calendar event appears in Google Calendar
- [ ] Candidate receives email invite
- [ ] Meet link is clickable and valid
- [ ] Timeline event created
- [ ] Updating status works from UI
- [ ] Filtering by application works
- [ ] Multiple calls can be scheduled

### Edge Cases

- [ ] Token refresh on expired access token
- [ ] Calendar API rate limit handling
- [ ] Timezone handling (UTC storage, local display)
- [ ] Past date validation
- [ ] Duplicate scheduling prevention
- [ ] Calendar not linked error handling
- [ ] Network failure graceful degradation

---

## Security Considerations

1. **OAuth Tokens**: Stored securely in NextAuth session
2. **Authorization**: Only recruiters can schedule (middleware check)
3. **Validation**: Input validation on both client and server
4. **Candidate Privacy**: Only email shared, no direct calendar access
5. **Token Refresh**: Automatic handling prevents token expiration

---

## Future Enhancements

Potential improvements for future sprints:

1. **Availability Sync**: Sync recruiter's free/busy from Google Calendar
2. **Smart Scheduling**: Suggest best time slots based on availability
3. **Bulk Actions**: Reschedule multiple interviews at once
4. **Recurring Interviews**: Support for interview series
5. **Calendar Preferences**: Allow recruiters to set preferred times
6. **Reminders**: Automated reminders before interview
7. **Video Recording**: Integrate with Google Meet recording API
8. **Analytics**: Track interview completion rates, no-shows
9. **Candidate Self-Scheduling**: Allow candidates to pick from available slots
10. **Multi-Calendar Support**: Support for Outlook, iCal

---

## Files Created/Modified

### Created

1. `/src/services/googleCalendarService.ts` (230 lines)
2. `/src/data-access/repositories/scheduledCallRepo.ts` (245 lines)
3. `/src/hooks/useScheduling.ts` (180 lines)
4. `/src/components/recruiter/scheduling/SchedulingPanel.tsx` (187 lines)
5. `/src/components/recruiter/scheduling/CallScheduler.tsx` (190 lines)
6. `/src/components/recruiter/scheduling/index.ts` (7 lines)

### Modified

1. `/src/services/trpc/recruiterRouter.ts` - Added 3 procedures (~200 lines)
2. `/src/auth/options.ts` - Added Calendar scopes (~10 lines)
3. `/docs/EPIC4_SPRINT_PLAN.md` - Updated progress tracking

**Total**: ~1,250 lines of production code

---

## Sprint 4 Days 4-5 Status: ✅ COMPLETE

All planned features implemented and ready for testing!

**Next Steps**:

1. Manual testing of end-to-end flow
2. Verify Calendar events created correctly
3. Test email invites received by candidates
4. Validate Meet links work
5. Proceed to Sprint 5: Transcription & Polish
