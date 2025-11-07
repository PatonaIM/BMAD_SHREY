# EP4-S17: Candidate-Initiated Call Scheduling with Recruiter Availability Slots

**Epic:** Epic 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S17  
**Priority:** High  
**Estimated Effort:** 8 Story Points  
**Status:** 📋 Ready for Development

---

## 📖 User Story

**As a** candidate who has completed an AI interview,  
**I want to** book a call directly with the recruiter using their available time slots,  
**So that** I can discuss my application and demonstrate my interest without waiting for recruiter outreach.

---

## 🎯 Acceptance Criteria

### **Candidate Experience**

1. **Eligibility & Access**
   - [ ] "Book a Call" button appears on application timeline after AI interview completion
   - [ ] Button is disabled/hidden if AI interview not completed (with tooltip explaining why)
   - [ ] Button shows recruiter's availability status ("Available slots this week" or "No slots available")
   - [ ] If no recruiter is assigned to job, show "Contact recruiter via messaging" fallback

2. **Slot Selection Interface**
   - [ ] Calendar view shows current week + next week (2 weeks total)
   - [ ] Available slots clearly indicated (green highlight, "Available" label)
   - [ ] Unavailable slots grayed out (past times, booked slots, recruiter unavailable)
   - [ ] Slots displayed in candidate's local timezone (auto-detected, with manual override)
   - [ ] Each slot shows: Date, Time, Duration (default 30 minutes), Recruiter name

3. **Booking Flow**
   - [ ] Candidate selects desired slot from calendar
   - [ ] Confirmation modal shows: Job title, recruiter name, date/time, timezone, GMeet link (if enabled)
   - [ ] Optional: Candidate can add notes/questions (500 char max) for recruiter to review
   - [ ] "Confirm Booking" button creates appointment and sends notifications
   - [ ] Success message: "Your call is scheduled! Check your email for details and calendar invite."

4. **Post-Booking Management**
   - [ ] Booked call appears in application timeline as new event
   - [ ] Candidate receives email confirmation with: Date/time, GMeet link, "Add to Calendar" button
   - [ ] Candidate can reschedule (up to 24 hours before) or cancel (with reason)
   - [ ] If candidate cancels, slot becomes available again for other candidates
   - [ ] Reminder email sent 24 hours before call + 1 hour before call

5. **Timeline Integration**
   - [ ] Timeline shows: "📞 Call Scheduled with [Recruiter Name]" event
   - [ ] Event card displays: Date/time, duration, GMeet link (if available), recruiter notes
   - [ ] If call completed, shows "✅ Call Completed" with feedback option for candidate
   - [ ] Candidate can rate call experience (1-5 stars) and provide optional feedback

---

### **Recruiter Experience**

6. **Availability Management**
   - [ ] Recruiter dashboard has "My Availability" settings page
   - [ ] Recruiter can set weekly recurring availability (e.g., "Mondays 2-5 PM, Wednesdays 10-12 PM")
   - [ ] Recurring slots automatically generate for current + next week (rolling 2-week window)
   - [ ] Recruiter can block specific dates (vacation, meetings) to remove slots
   - [ ] Recruiter can add one-off slots outside regular schedule ("Extra hours this week")
   - [ ] Slot duration configurable (15, 30, 45, 60 minutes) - default 30 minutes

7. **Booking Notifications**
   - [ ] Real-time notification when candidate books a slot: "Sarah Chen booked a call for Nov 15 at 2:00 PM"
   - [ ] Email notification with candidate details: Name, job applied to, AI interview score, candidate notes
   - [ ] Google Chat notification (if enabled) with booking details
   - [ ] Daily digest email at 8 AM: "You have 3 calls scheduled today"

8. **Calendar Integration**
   - [ ] Auto-create Google Calendar event when candidate books slot
   - [ ] Calendar event includes: Candidate name, job title, GMeet link (auto-generated), candidate notes
   - [ ] If recruiter cancels/reschedules calendar event, platform updates accordingly
   - [ ] Sync recruiter's Google Calendar to auto-block unavailable times (optional feature)

9. **Call Management**
   - [ ] Recruiter sees list of upcoming calls on dashboard: "Upcoming Calls (5 this week)"
   - [ ] Each call card shows: Candidate name/photo, job title, AI score, date/time, GMeet link
   - [ ] Recruiter can reschedule (candidate notified) or cancel (with reason sent to candidate)
   - [ ] After call completes, recruiter can add private notes to application timeline
   - [ ] Recruiter can mark call as "No-show" if candidate doesn't join (automatically recorded in timeline)

10. **Analytics & Insights**
    - [ ] Dashboard shows: "15 calls booked this week", "80% attendance rate", "Average call duration: 32 min"
    - [ ] Track conversion: "Candidates who booked calls are 2.3x more likely to advance to interview"
    - [ ] Identify high-demand slots: "Tuesday 2-3 PM is your most popular time"

---

### **Admin & System Behavior**

11. **Business Rules**
    - [ ] Candidates can only book ONE call per application (prevent slot hogging)
    - [ ] Candidates cannot book slots less than 2 hours in advance (give recruiter prep time)
    - [ ] If recruiter doesn't join call within 10 minutes, candidate notified and can reschedule
    - [ ] Slots expire if not booked within 2 weeks (rolling window prevents stale availability)

12. **Google Meet Integration**
    - [ ] GMeet link auto-generated when slot is booked (via Google Calendar API)
    - [ ] Link included in confirmation email, timeline event, and recruiter notification
    - [ ] If GMeet generation fails, fallback to manual link entry by recruiter
    - [ ] Call recordings can be enabled (requires candidate consent checkbox during booking)

13. **Error Handling**
    - [ ] If slot is booked by another candidate simultaneously, show "This slot was just booked. Please select another."
    - [ ] If recruiter deletes availability after candidate booked, candidate notified and prompted to reschedule
    - [ ] If recruiter account is deactivated, candidates notified and offered alternative recruiter (if multi-recruiter job)

---

## 🎨 UI/UX Requirements

### **Candidate Slot Selection Interface**

```
┌─────────────────────────────────────────────────────┐
│  Book a Call with John (Recruiter)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📅 Select a time that works for you:               │
│                                                     │
│  This Week                    Next Week            │
│  ─────────────────────────────────────────         │
│                                                     │
│  Monday, Nov 11                                     │
│  ○ 2:00 PM - 2:30 PM   ● 3:00 PM - 3:30 PM (Booked)│
│  ○ 4:00 PM - 4:30 PM                                │
│                                                     │
│  Tuesday, Nov 12                                    │
│  ○ 10:00 AM - 10:30 AM                              │
│  ○ 2:00 PM - 2:30 PM                                │
│                                                     │
│  Wednesday, Nov 13                                  │
│  ○ 1:00 PM - 1:30 PM                                │
│                                                     │
│  [No slots available? Message recruiter instead]    │
│                                                     │
│  Your timezone: PST (GMT-8) [Change]                │
│                                                     │
│  [Cancel]                  [Continue to Booking →]  │
└─────────────────────────────────────────────────────┘
```

### **Booking Confirmation Modal**

```
┌─────────────────────────────────────────────────────┐
│  Confirm Your Call Booking                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📞 Call Details:                                   │
│  • Job: Senior React Developer                      │
│  • Recruiter: John Smith                            │
│  • Date: Monday, Nov 11, 2025                       │
│  • Time: 2:00 PM - 2:30 PM PST                      │
│  • Google Meet link will be sent to your email      │
│                                                     │
│  📝 Add notes for recruiter (optional):             │
│  ┌───────────────────────────────────────────────┐ │
│  │ I'd like to discuss my experience with...    │ │
│  │                                               │ │
│  │ (500 characters max, 432 remaining)           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ☑ Send me reminder emails (24 hours + 1 hour before)│
│                                                     │
│  [Back to Slots]          [Confirm Booking ✓]      │
└─────────────────────────────────────────────────────┘
```

### **Recruiter Availability Settings**

```
┌─────────────────────────────────────────────────────┐
│  My Availability Settings                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Weekly Recurring Availability:                     │
│  ┌─────────────────────────────────────────┐       │
│  │ Monday:    [2:00 PM ▼] to [5:00 PM ▼]  │       │
│  │ Tuesday:   Not available                │       │
│  │ Wednesday: [10:00 AM ▼] to [12:00 PM ▼]│       │
│  │ Thursday:  [2:00 PM ▼] to [5:00 PM ▼]  │       │
│  │ Friday:    Not available                │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  Slot Duration: [30 minutes ▼]                      │
│  Buffer Between Calls: [15 minutes ▼]               │
│                                                     │
│  🚫 Block Dates (Vacation, Out of Office):          │
│  • Nov 22-24, 2025 (Thanksgiving) [Remove]         │
│  [+ Add Blocked Dates]                              │
│                                                     │
│  ➕ One-Off Slots (Extra availability):             │
│  • Nov 18, 2025 at 7:00 PM - 8:00 PM [Remove]      │
│  [+ Add One-Off Slot]                               │
│                                                     │
│  ☑ Sync with Google Calendar (block busy times)     │
│  ☑ Auto-generate Google Meet links                  │
│                                                     │
│  [Cancel]                    [Save Availability]    │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Dependencies

**Depends On:**

- **EP2-S10:** AI Interview system (candidates must complete AI interview to be eligible)
- **EP4-S12:** Candidate timeline (booking button appears on timeline)
- **EP4-S13:** Recruiter timeline (calls appear as events in recruiter view)

**Blocks:**

- **None** (independent feature)

**Related:**

- **EP4-S10:** Google Chat notifications (booking notifications via Google Chat)
- **EP4-S13:** GMeet scheduling (reuses Google Calendar API integration)

---

## 🧪 Testing Requirements

### **Unit Tests**

- [ ] Slot generation logic (weekly recurring + one-off slots)
- [ ] Timezone conversion (candidate and recruiter in different timezones)
- [ ] Slot conflict detection (prevent double-booking)
- [ ] Booking eligibility check (AI interview completed)
- [ ] Reminder scheduling (24 hours + 1 hour before call)

### **Integration Tests**

- [ ] Google Calendar API integration (create/update/delete events)
- [ ] GMeet link generation via Calendar API
- [ ] Email notification delivery (confirmation, reminders)
- [ ] Real-time notification updates (WebSocket for instant booking alerts)
- [ ] Timeline event creation when call is booked/completed

### **E2E Tests**

- [ ] Candidate books slot → Receives confirmation → Call appears in timeline
- [ ] Recruiter sets availability → Candidate sees slots → Books successfully
- [ ] Candidate reschedules call → Recruiter notified → Calendar updated
- [ ] Recruiter cancels call → Candidate notified → Slot becomes available
- [ ] No-show scenario → Marked in timeline → Analytics updated

### **Edge Cases**

- [ ] Candidate books last available slot (concurrency test with 2 candidates)
- [ ] Recruiter deletes availability after candidate booked (graceful rescheduling)
- [ ] Timezone change during booking (candidate travels to different timezone)
- [ ] Google Calendar API failure (fallback to manual link entry)
- [ ] Candidate completes AI interview while viewing slot selection (refresh slots)

---

## 📊 Success Metrics

- **Booking Rate:** >40% of candidates who complete AI interviews book a call
- **Attendance Rate:** >85% of booked calls attended by both parties
- **Time to Engagement:** 50% reduction in time from AI interview completion to recruiter conversation
- **Conversion Impact:** Candidates who book calls are 2x+ more likely to advance to next stage
- **Recruiter Satisfaction:** >90% of recruiters find slot-based scheduling "more efficient" than manual outreach

---

## 🚀 Implementation Notes

### **Backend**

- **RecruiterAvailability Model:**
  - `recurringSlots`: Array of weekly schedule (day, startTime, endTime)
  - `blockedDates`: Array of date ranges to exclude
  - `oneOffSlots`: Array of specific date/time exceptions
  - `slotDuration`: Minutes (default 30)
  - `bufferTime`: Minutes between calls (default 15)

- **CallBooking Model:**
  - `candidateId`, `recruiterId`, `applicationId`, `jobId`
  - `scheduledAt`: DateTime (in UTC)
  - `duration`: Minutes
  - `timezone`: Candidate's timezone
  - `gmeetLink`: String (generated via Google Calendar API)
  - `candidateNotes`: String (optional, max 500 chars)
  - `status`: Enum (Scheduled, Completed, Cancelled, NoShow)
  - `createdAt`, `updatedAt`

- **API Endpoints:**
  - `GET /api/recruiter/:recruiterId/availability` - Fetch available slots
  - `POST /api/recruiter/:recruiterId/availability` - Update recurring schedule
  - `POST /api/applications/:id/book-call` - Candidate books slot
  - `PATCH /api/call-bookings/:id/reschedule` - Reschedule call
  - `DELETE /api/call-bookings/:id` - Cancel call

### **Frontend**

- **Components:**
  - `SlotSelectionCalendar.tsx` - Visual calendar with available/booked slots
  - `BookingConfirmationModal.tsx` - Final confirmation before booking
  - `RecruiterAvailabilitySettings.tsx` - Recruiter availability management
  - `UpcomingCallsWidget.tsx` - Dashboard widget showing upcoming calls

- **State Management:**
  - Use React Query for slot fetching (real-time updates)
  - Optimistic updates for booking (instant UI feedback)
  - WebSocket listener for recruiter-side booking notifications

### **Third-Party Integrations**

- **Google Calendar API:**
  - Create event with GMeet link via `events.insert(conferenceData: createRequest)`
  - Sync recruiter calendar to block busy times (optional feature)
  - Handle OAuth2 authorization flow for calendar access

- **Email Service (SendGrid/AWS SES):**
  - Confirmation emails with .ics calendar file attachment
  - Reminder emails (24 hours + 1 hour before)
  - Cancellation/reschedule notification emails

---

## ✅ Definition of Done

### **Backend Complete:**

- [ ] RecruiterAvailability and CallBooking models implemented
- [ ] Slot generation algorithm handles recurring + one-off + blocked dates
- [ ] API endpoints tested with 100% coverage
- [ ] Google Calendar integration creates events with GMeet links
- [ ] Timezone conversion validated for international candidates/recruiters
- [ ] Concurrency handling prevents double-booking (database-level locks)

### **Frontend Complete:**

- [ ] Slot selection calendar visually intuitive (green = available, gray = booked)
- [ ] Booking confirmation modal matches UX spec
- [ ] Recruiter availability settings page functional
- [ ] Upcoming calls widget shows next 7 days of bookings
- [ ] Mobile-responsive (candidate can book from phone)

### **Integration Complete:**

- [ ] Timeline events created for booked/completed calls
- [ ] Email notifications sent for confirmations, reminders, cancellations
- [ ] Google Chat notifications sent to recruiter (if enabled)
- [ ] Calendar invites automatically added to candidate and recruiter calendars

### **Testing Complete:**

- [ ] E2E test: Candidate books call → Receives confirmation → Attends call
- [ ] Edge case test: Double-booking prevented with concurrent requests
- [ ] User acceptance testing with 5 recruiters + 10 candidates (>90% satisfaction)

### **Documentation Complete:**

- [ ] User guide: "How to Set Your Availability" (for recruiters)
- [ ] User guide: "How to Book a Call with a Recruiter" (for candidates)
- [ ] API documentation updated with new endpoints
- [ ] Analytics dashboard updated to track booking metrics

---

## 📝 Additional Notes

**Why This Feature Matters:**

- **Candidate Empowerment:** Proactive candidates can engage immediately after AI interview (reduce time to next stage)
- **Recruiter Efficiency:** No manual back-and-forth scheduling (automatic slot-based system)
- **Conversion Optimization:** Early recruiter conversations increase candidate engagement and reduce drop-off

**Design Principles:**

- **Simplicity:** Candidate sees slots, picks one, done (no complex scheduling tools)
- **Transparency:** Candidates know exactly when they'll talk to recruiter (reduces anxiety)
- **Respect Time:** 2-hour minimum booking window + reminders prevent last-minute disruptions

**Future Enhancements (Phase 2):**

- Multi-recruiter scheduling (candidate picks from team of recruiters)
- Video call directly in platform (no Google Meet dependency)
- AI-suggested best times based on candidate activity patterns
- Group calls (candidate + 2 recruiters for panel interviews)

---

**Story Status:** ✅ Ready for UX review and engineering estimation
