# EP4-S10: Google Chat Notification Integration

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S10  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** to receive real-time notifications via Google Chat for application events,  
**So that** I can respond quickly to candidate activity without constantly checking the dashboard.

---

## Acceptance Criteria

### AC1: Notification Setup UI

- [ ] "Get Notifications" button visible on Recruiter Dashboard
- [ ] Clicking button opens Google Chat integration setup modal
- [ ] Modal explains notification types and frequency
- [ ] Setup flow guides recruiter through Google Chat webhook configuration
- [ ] Success confirmation message after setup completion
- [ ] "Manage Notifications" link to modify or disable notifications

### AC2: Google Chat Webhook Integration

- [ ] System accepts Google Chat Incoming Webhook URL from recruiter
- [ ] Webhook URL stored securely (encrypted) in database per recruiter
- [ ] Test notification sent immediately after setup to verify configuration
- [ ] Error handling for invalid/expired webhook URLs
- [ ] Support for updating webhook URL without losing notification preferences

### AC3: Hourly Application Digest (Batch Notification)

- [ ] System aggregates applications received in the past hour for subscribed jobs
- [ ] Notification sent every hour on the hour (XX:00) if new applications exist
- [ ] Message format: "📥 **5 New Applications** in the past hour: 3 for Senior Engineer, 2 for Product Manager"
- [ ] Includes clickable links to application review page
- [ ] No notification sent if zero applications received
- [ ] Digest includes application count per job

### AC4: Real-Time AI Interview Completion

- [ ] Notification triggered immediately when candidate completes AI interview
- [ ] Message format: "🎤 **Jane Doe** completed AI interview for **Senior Engineer** | Score: 78/100 (+12 boost)"
- [ ] Includes direct link to interview recording and transcript
- [ ] Shows boosted application score with before/after comparison
- [ ] Icon/emoji indicator for interview performance (🟢 strong, 🟡 moderate, 🔴 weak)

### AC5: Real-Time Stage Completion Notifications

- [ ] Notifications sent immediately for all post-application stage completions:
  - Candidate fills Expectations form → "📝 **John Smith** submitted expectations for **Product Designer**"
  - Candidate uploads assignment → "📎 **Sarah Lee** submitted assignment for **Backend Engineer**"
  - Candidate confirms interview slot → "✅ **Mike Chen** confirmed interview on Nov 10 at 2 PM"
  - Candidate rejects interview invitation → "❌ **Emily Wang** declined interview for **Data Analyst**"
- [ ] Each notification includes candidate name, job title, and action link
- [ ] Notification includes relevant context (assignment link, interview time, etc.)

### AC6: Notification Preferences & Management

- [ ] Recruiter can enable/disable notifications globally or per job
- [ ] Recruiter can set quiet hours (no notifications during specified times)
- [ ] Recruiter can choose notification frequency for digests (hourly, daily, off)
- [ ] Recruiter can test notifications with sample message
- [ ] Notification history log accessible in dashboard (last 30 days)

### AC7: Multi-Recruiter Support

- [ ] Each recruiter configures their own Google Chat webhook independently
- [ ] Notifications sent only for jobs recruiter is subscribed to
- [ ] Shared jobs don't cause duplicate notifications (each recruiter gets their own)
- [ ] Admin can view notification delivery status and errors

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Database Schema:**

  ```typescript
  interface RecruiterNotificationSettings {
    _id: ObjectId;
    recruiterId: ObjectId;
    googleChatWebhookUrl: string; // Encrypted
    notificationsEnabled: boolean;
    digestFrequency: 'hourly' | 'daily' | 'off';
    quietHoursStart?: string; // HH:MM format
    quietHoursEnd?: string; // HH:MM format
    jobSpecificSettings: {
      jobId: ObjectId;
      enabled: boolean;
    }[];
    lastNotificationSent: Date;
    failureCount: number; // Track webhook failures
    createdAt: Date;
    updatedAt: Date;
  }
  ```

- [ ] **Notification Queue System:**
  - Background worker processes notification queue
  - Redis-based queue for real-time notifications (or database queue for MVP)
  - Retry logic for failed webhook deliveries (3 attempts with exponential backoff)
  - Dead letter queue for permanently failed notifications

- [ ] **API Endpoints:**
  - `POST /api/recruiter/notifications/setup` - Configure Google Chat webhook
  - `PUT /api/recruiter/notifications/settings` - Update preferences
  - `POST /api/recruiter/notifications/test` - Send test notification
  - `GET /api/recruiter/notifications/history` - Fetch notification log
  - `DELETE /api/recruiter/notifications/disable` - Disable notifications

- [ ] **Event Handlers:**
  - `onApplicationReceived` → Queue hourly digest update
  - `onAIInterviewCompleted` → Queue real-time notification
  - `onExpectationsSubmitted` → Queue real-time notification
  - `onAssignmentUploaded` → Queue real-time notification
  - `onInterviewConfirmed` → Queue real-time notification
  - `onInterviewDeclined` → Queue real-time notification

- [ ] **Cron Jobs:**
  - Hourly digest aggregator (runs at XX:55 to prepare for XX:00 delivery)
  - Daily digest aggregator (if recruiter chooses daily frequency)
  - Webhook health checker (validates URLs every 24 hours)

### Frontend Implementation

- [ ] **Components:**
  - `NotificationSetupModal.tsx` - Webhook configuration wizard
  - `NotificationPreferences.tsx` - Settings management UI
  - `NotificationHistory.tsx` - Log of sent notifications
  - `GetNotificationsButton.tsx` - Entry point on dashboard

- [ ] **State Management:**
  - React Query for notification settings CRUD operations
  - Optimistic updates for enable/disable toggles
  - Toast notifications for setup success/failure

- [ ] **Forms:**
  - Webhook URL input with validation (must be valid Google Chat webhook format)
  - Quiet hours time picker
  - Job-specific notification toggles (checkboxes per subscribed job)

### Google Chat Message Formatting

- [ ] **Message Structure:**
  - Uses Google Chat Card format (v2) for rich formatting
  - Includes header with notification type icon
  - Primary text with candidate/job info
  - Action buttons for quick navigation
  - Footer with timestamp and "View in TeamMatch" link

- [ ] **Example Message JSON:**
  ```json
  {
    "text": "Jane Doe completed AI interview",
    "cards": [
      {
        "header": {
          "title": "🎤 AI Interview Completed",
          "subtitle": "Senior Engineer at Acme Corp"
        },
        "sections": [
          {
            "widgets": [
              {
                "textParagraph": {
                  "text": "<b>Jane Doe</b> completed their AI interview<br>Score: <font color=\"#0f9d58\">78/100 (+12 boost)</font>"
                }
              },
              {
                "buttons": [
                  {
                    "textButton": {
                      "text": "View Interview",
                      "onClick": {
                        "openLink": {
                          "url": "https://teammatch.ai/applications/abc123/interview"
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
  ```

### Testing

- [ ] **Unit Tests:**
  - Webhook URL validation logic
  - Notification message formatting
  - Quiet hours calculation
  - Digest aggregation logic

- [ ] **Integration Tests:**
  - Mock Google Chat webhook responses
  - Event trigger → notification queue → delivery flow
  - Retry logic for failed webhooks
  - Multi-recruiter notification isolation

- [ ] **E2E Tests:**
  - Recruiter sets up notifications and receives test message
  - Real-time notification sent when candidate completes AI interview
  - Hourly digest aggregates multiple applications correctly
  - Notification disabled when recruiter unsubscribes from job

### Security & Compliance

- [ ] Webhook URLs encrypted at rest using AES-256
- [ ] Webhook URLs never exposed in client-side code
- [ ] Rate limiting on notification API endpoints (10 requests/minute)
- [ ] Audit logging for all notification deliveries
- [ ] GDPR compliance: recruiter can export notification history

---

## Technical Notes

### Google Chat Webhook Setup

Recruiters obtain webhook URL from Google Chat by:

1. Opening Google Chat Space
2. Going to Space settings → Webhooks
3. Creating new webhook with name "TeamMatch Notifications"
4. Copying webhook URL (format: `https://chat.googleapis.com/v1/spaces/*/messages?key=*`)

### Notification Delivery Architecture

```
Application Event → Event Bus → Notification Queue → Worker Process → Google Chat API
                                                   ↓
                                            Retry Queue (on failure)
                                                   ↓
                                          Dead Letter Queue (after 3 failures)
```

### Performance Considerations

- Batch database queries for hourly digest (single query per recruiter)
- Use Redis for notification queue to avoid database bottlenecks
- Webhook delivery timeout: 5 seconds (mark as failed if no response)
- Maximum 100 notifications per recruiter per hour (spam prevention)

### Error Handling

- **Invalid Webhook URL:** Return 400 error with clear message during setup
- **Webhook Delivery Failure:** Retry 3 times, then email recruiter with error
- **Webhook Disabled by Google:** Detect 404 response, disable notifications, notify recruiter
- **Rate Limit Exceeded:** Queue notifications for delayed delivery, warn recruiter

---

## Dependencies

- **Requires:** EP4-S9 (Job subscription system for filtering relevant notifications)
- **Blocks:** None (can be implemented independently)
- **Related:** EP4-S13 (Timeline events trigger stage completion notifications)

---

## UX Considerations

### Consult UX Expert For:

- Notification setup modal flow (multi-step wizard vs. single form)
- Visual design of "Get Notifications" button (placement, prominence)
- Notification preferences UI (inline vs. dedicated settings page)
- Error messaging when webhook setup fails
- Notification history presentation (table vs. timeline)

### Accessibility Requirements

- Modal accessible via keyboard navigation
- Screen reader announcements for notification status changes
- Clear error messages with actionable guidance
- ARIA labels for all interactive elements

---

## Success Metrics

- **Adoption:** 60% of active recruiters enable Google Chat notifications within 2 weeks
- **Reliability:** 99% notification delivery success rate
- **Responsiveness:** 95% of real-time notifications delivered within 10 seconds of event
- **Engagement:** 40% of recruiters click through notification links to take action

---

## Future Enhancements

- Slack integration (similar webhook-based approach)
- Microsoft Teams integration
- SMS notifications for critical events (high-value candidates)
- Email fallback when webhook delivery fails
- Notification templates customization (recruiter can edit message format)
- AI-powered notification prioritization (only notify for high-scoring candidates)

---

## Notes

- Google Chat API documentation: https://developers.google.com/chat/api/guides/message-formats/cards
- Consider using `node-cron` for scheduled digest jobs
- Webhook encryption library: `crypto` module or `@aws-crypto/client-node`
- For MVP, database-based queue may be sufficient; upgrade to Redis/BullMQ for scale
