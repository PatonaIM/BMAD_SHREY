# EP4-S12: Application Timeline View - Candidate Perspective

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S12  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** candidate,  
**I want** a visual timeline showing my application progress from submission through all hiring stages,  
**So that** I can understand where I stand, what actions I need to take next, and track recruiter activity transparently.

---

## Acceptance Criteria

### AC1: Timeline Layout & Structure

- [ ] Full-page timeline view replacing current application detail page
- [ ] Vertical timeline with chronological events (most recent at top)
- [ ] Each timeline event displayed as card/node with icon, timestamp, and description
- [ ] Sticky header with candidate name, job title, and quick actions remains visible while scrolling
- [ ] Timeline auto-scrolls to most recent unread event on page load
- [ ] Responsive design works on desktop, tablet, and mobile

### AC2: Header Section (Sticky)

- [ ] Displays candidate's own name and profile photo (top left)
- [ ] Job title and company name prominently displayed
- [ ] Current application status badge (Submitted, Under Review, Interview Scheduled, etc.)
- [ ] Overall match score displayed with visual indicator (circular progress or badge)
- [ ] Quick action buttons:
  - "View My Profile" (navigate to profile page)
  - "Edit Application" (if allowed in current stage)
  - "Withdraw Application" (opens confirmation modal)
- [ ] Header background color reflects status (green for positive, yellow for pending, gray for neutral)

### AC3: Timeline Events - Application Stage

- [ ] **Application Submitted:**
  - Event card shows submission timestamp
  - Displays initial match score (before AI interview)
  - Shows which profile sections were included (resume, cover letter, expectations)
  - "View Submitted Application" link to see what recruiter sees
- [ ] **Profile Score Calculated:**
  - Shows match score breakdown (semantic 40%, skills 35%, experience 15%, other 10%)
  - Visual score components (progress bars or pie chart)
  - Link to detailed score explanation page

### AC4: Timeline Events - AI Interview Stage

- [ ] **AI Interview Invitation:**
  - Event card with "Take AI Interview to Boost Score" CTA button
  - Explanation of potential score boost (5-15 points)
  - Estimated interview duration (15-20 minutes)
  - "Learn More" link explaining AI interview process
- [ ] **AI Interview Scheduled:**
  - Shows scheduled date/time (if candidate pre-schedules)
  - "Reschedule" and "Start Interview" buttons
  - Countdown timer if interview is upcoming
- [ ] **AI Interview In Progress:**
  - Real-time status indicator during interview
  - "Resume Interview" button if interrupted
- [ ] **AI Interview Completed:**
  - Shows completion timestamp
  - Displays score boost received (+X points)
  - Updated total application score
  - "View Interview Results" link to feedback page
  - "Watch Recording" button (optional candidate access)

### AC5: Timeline Events - Expectations Stage

- [ ] **Expectations Form Requested:**
  - Event card with "Fill Expectations" CTA button
  - Brief description of what expectations include (salary, start date, work mode, etc.)
  - "Fill Now" button navigates to expectations form
- [ ] **Expectations Submitted:**
  - Shows submission timestamp
  - Summary of submitted expectations (salary range, availability, remote preference)
  - "Edit Expectations" button (if allowed)

### AC6: Timeline Events - Recruiter Review

- [ ] **Application Under Review:**
  - Event shows when recruiter first viewed application
  - Message: "Recruiter is reviewing your application"
  - No candidate action required (waiting state)
- [ ] **Recruiter Viewed AI Interview:**
  - Shows timestamp when recruiter watched interview recording
  - Message: "Recruiter reviewed your AI interview"
- [ ] **Recruiter Reviewed Expectations:**
  - Shows timestamp
  - Message: "Recruiter reviewed your expectations"

### AC7: Timeline Events - Interview & Assignment Stages

- [ ] **Interview Invitation Received:**
  - Event card shows interview type (phone screen, technical, final round)
  - Proposed date/time or "Select from available slots" link
  - "Accept" and "Decline" buttons
  - GMeet link provided after acceptance
- [ ] **Interview Scheduled:**
  - Shows confirmed date/time
  - GMeet link (clickable, opens in new tab)
  - Calendar download option (.ics file)
  - "Reschedule" and "Cancel" buttons
- [ ] **Interview Completed:**
  - Shows completion timestamp
  - Message: "Waiting for recruiter feedback"
  - Recruiter feedback appears when provided
- [ ] **Assignment Given:**
  - Event card shows assignment details (title, description, deadline)
  - PDF link to assignment brief (if provided by recruiter)
  - External platform link (HackerRank, CodeSignal, etc.) if applicable
  - **"Upload Submission"** button opens file upload modal:
    - Drag-and-drop file upload area
    - Multiple file support (code files, documents, presentations, zip files)
    - File preview for uploaded items
    - Notes textarea (optional: explanation of submission)
    - "Submit Assignment" button
  - Countdown timer until deadline
  - "Request Extension" button (sends request to recruiter)
- [ ] **Assignment Submitted:**
  - Shows submission timestamp
  - List of submitted files with download links
  - Submission notes (if provided)
  - Message: "Recruiter is reviewing your submission"
  - "Resubmit" button (if allowed before deadline or with permission)

### AC8: Timeline Events - Final Stages

- [ ] **Moved to Next Round:**
  - Celebration message with positive indicator
  - Explanation of next stage
- [ ] **Application Rejected:**
  - Shows rejection timestamp
  - Recruiter feedback (if provided)
  - "Request Detailed Feedback" button
  - "Apply to Similar Jobs" recommendation section
- [ ] **Offer Extended:**
  - Celebration animation/confetti effect
  - Offer details summary (salary, benefits, start date)
  - "View Full Offer Letter" link
  - "Accept" and "Decline" buttons

### AC9: Real-Time Updates & Notifications

- [ ] Timeline automatically refreshes when recruiter takes action (no page reload needed)
- [ ] In-app notification badge shows unread timeline events
- [ ] Unread events highlighted with subtle background color or icon
- [ ] "Mark all as read" option
- [ ] Email notifications sent for major events (interview scheduled, offer extended, rejection)

### AC10: Visibility & Permissions

- [ ] Candidates see all their own actions (application, interview, submissions)
- [ ] Candidates see recruiter review actions (viewed profile, reviewed interview)
- [ ] Candidates do NOT see internal recruiter notes or discussions
- [ ] Candidates cannot edit past timeline events (append-only log)
- [ ] Candidates can download timeline history as PDF

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Timeline Events Data Model:**

  ```typescript
  interface TimelineEvent {
    _id: ObjectId;
    applicationId: ObjectId;
    eventType:
      | 'application_submitted'
      | 'ai_interview_completed'
      | 'expectations_submitted'
      | 'interview_scheduled'
      | 'assignment_given'
      | 'assignment_submitted'
      | 'recruiter_viewed_profile'
      | 'status_changed'
      | 'offer_extended'
      | 'application_rejected';
    actorId: ObjectId; // User who triggered event (candidate or recruiter)
    actorRole: 'candidate' | 'recruiter';
    timestamp: Date;
    metadata: {
      [key: string]: any; // Event-specific data (scores, links, messages)
    };
    isRead: boolean; // For candidate notification tracking
    visibleTo: ('candidate' | 'recruiter' | 'admin')[];
  }
  ```

- [ ] **Event Creation Triggers:**
  - Application submission → Create `application_submitted` event
  - AI interview completion → Create `ai_interview_completed` event with score data
  - Expectations form submission → Create `expectations_submitted` event
  - Recruiter views profile → Create `recruiter_viewed_profile` event
  - Interview scheduled → Create `interview_scheduled` event with GMeet link
  - Assignment uploaded → Create `assignment_submitted` event with file links

- [ ] **API Endpoints:**
  - `GET /api/candidate/applications/:appId/timeline` - Fetch all timeline events for candidate
  - `POST /api/candidate/applications/:appId/timeline/mark-read` - Mark events as read
  - `GET /api/candidate/applications/:appId/timeline/export` - Export timeline as PDF
  - WebSocket endpoint: `/ws/applications/:appId/timeline` - Real-time event streaming

- [ ] **Real-Time Updates:**
  - WebSocket connection subscribes to application timeline events
  - Server broadcasts new events to connected candidates
  - Client-side listener updates UI without page refresh

### Frontend Implementation

- [ ] **Components:**
  - `CandidateApplicationTimeline.tsx` - Main timeline container
  - `TimelineStickyHeader.tsx` - Candidate name, score, actions
  - `TimelineEventCard.tsx` - Individual event display (polymorphic based on event type)
  - `ApplicationSubmittedEvent.tsx` - Specific event type component
  - `AIInterviewCompletedEvent.tsx` - AI interview event with score boost
  - `InterviewScheduledEvent.tsx` - Interview event with GMeet link
  - `AssignmentGivenEvent.tsx` - Assignment event with upload button
  - `OfferExtendedEvent.tsx` - Offer event with celebration animation

- [ ] **State Management:**
  - React Query for initial timeline fetch
  - WebSocket hook for real-time updates
  - Local state for "mark as read" optimistic updates
  - Context for application metadata (shared across event cards)

- [ ] **Styling:**
  - Vertical timeline with connector lines between events
  - Event icons color-coded by category (blue for info, green for success, red for rejection)
  - Smooth scroll animations when navigating to specific events
  - Skeleton loaders for initial page load
  - Mobile-responsive: timeline becomes horizontal carousel on small screens

### Timeline Event Rendering Logic

```typescript
function renderTimelineEvent(event: TimelineEvent) {
  switch (event.eventType) {
    case 'application_submitted':
      return <ApplicationSubmittedEvent data={event.metadata} />;
    case 'ai_interview_completed':
      return <AIInterviewCompletedEvent scoreBoost={event.metadata.scoreBoost} />;
    case 'interview_scheduled':
      return <InterviewScheduledEvent gmeetLink={event.metadata.gmeetLink} />;
    case 'assignment_given':
      return <AssignmentGivenEvent details={event.metadata} />;
    case 'offer_extended':
      return <OfferExtendedEvent offer={event.metadata.offer} />;
    default:
      return <GenericTimelineEvent event={event} />;
  }
}
```

### Testing

- [ ] **Unit Tests:**
  - Timeline event sorting (chronological order)
  - Event visibility filtering (candidate-only events)
  - "Mark as read" logic
  - Event metadata extraction

- [ ] **Integration Tests:**
  - API endpoint returns correct events for candidate
  - WebSocket broadcasts events in real-time
  - Event creation triggers on application actions
  - PDF export generates valid document

- [ ] **E2E Tests:**
  - Candidate submits application, timeline shows submission event
  - Candidate completes AI interview, timeline updates with score boost
  - Recruiter schedules interview, candidate sees event in real-time
  - Candidate uploads assignment, timeline shows submission confirmation
  - Timeline auto-scrolls to unread events on page load

---

## Dependencies

- **Requires:**
  - Current application system (EP2, EP3) for event generation
  - WebSocket infrastructure for real-time updates
  - PDF generation library for timeline export
- **Blocks:** EP4-S13 (Recruiter timeline view uses same data model)
- **Related:** EP4-S10 (Notifications alert candidate to check timeline)

---

## UX Considerations

### Consult UX Expert For:

- **Timeline Layout:** Vertical vs. horizontal vs. hybrid (desktop vs. mobile)
- **Event Card Design:** Information density, action button placement
- **Sticky Header:** Height, shadow effects, breakpoints for mobile
- **Loading States:** Skeleton design, progressive loading strategy
- **Empty States:** Messaging when no events exist yet
- **Status Color Coding:** Color psychology for different stages
- **Animation:** Confetti for offer, subtle transitions for new events
- **Mobile Optimization:** Horizontal scroll vs. vertical collapse

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation through timeline events
- Screen reader announcements for new events
- Focus management when events update in real-time
- Sufficient color contrast for status indicators
- Alt text for all icons and visual indicators

---

## Success Metrics

- **Engagement:** 85% of candidates view timeline within 24 hours of application submission
- **Transparency:** 90% candidate satisfaction with status visibility (post-launch survey)
- **Action Completion:** 60% of candidates complete prompted actions (AI interview, expectations form) within 48 hours
- **Reduced Inquiries:** 40% reduction in "Where's my application?" support tickets
- **Time on Page:** Average 3+ minutes spent viewing timeline per session

---

## Future Enhancements

- Timeline "story mode" (narrative summary of journey so far)
- Candidate ability to add private notes to timeline events
- Comparison view: "How you compare to other applicants" (anonymized)
- Predictive timeline: "Expected next steps based on similar applications"
- Share timeline with mentors/career coaches (privacy-controlled)
- Integration with calendar apps (auto-add interview events)

---

## Notes

- Ensure GDPR compliance: candidates can export and delete timeline data
- Consider candidate emotional state: rejections need empathetic messaging
- Timeline should feel "living" and dynamic, not static and bureaucratic
- Privacy: Never expose internal recruiter discussions or other candidates' data
