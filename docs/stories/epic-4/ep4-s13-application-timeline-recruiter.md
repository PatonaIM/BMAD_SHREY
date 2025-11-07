# EP4-S13: Application Timeline View - Recruiter Perspective

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S13  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** a comprehensive timeline view of each candidate's application journey with embedded profile access and action capabilities,  
**So that** I can efficiently review candidates, track their progress, and take hiring actions without navigating between multiple pages.

---

## Acceptance Criteria

### AC1: Timeline Layout & Structure

- [ ] Full-page timeline view for recruiter application review
- [ ] Vertical timeline with all candidate and recruiter actions chronologically displayed
- [ ] Sticky header with candidate summary and quick actions remains visible while scrolling
- [ ] Timeline shows both candidate actions (blue) and recruiter actions (purple/gray)
- [ ] Read-only embedded profile section accessible without leaving timeline
- [ ] Desktop-optimized layout with collapsible sidebar for profile

### AC2: Sticky Header Section

- [ ] Displays candidate name, profile photo, and application date
- [ ] Job title and match score prominently shown
- [ ] Current application status badge with ability to change status (dropdown)
- [ ] Quick action buttons:
  - **"View Full Profile"** (expands sidebar or modal with complete candidate profile)
  - **"Disqualify"** (opens confirmation modal with reason selection)
  - **"Move to Next Stage"** (advances status with optional notes)
  - **"Share Profile"** (opens section selection modal - EP4-S14)
  - **"Download Resume"** (PDF download)
  - **"Schedule Interview"** (opens scheduling interface)
  - **"Send Message"** (opens email/notification composer)
- [ ] Header background color indicates status urgency (red for action needed, green for progressing well)

### AC3: Embedded Profile Section (Read-Only)

- [ ] Collapsible sidebar or expandable panel showing:
  - **Profile Summary:** Name, email, phone, location, availability
  - **Match Score Breakdown:** Semantic (40%), Skills (35%), Experience (15%), Other (10%)
  - **Skills List:** All candidate skills with proficiency levels
  - **Experience Timeline:** Work history with company, role, dates, descriptions
  - **Education:** Degrees, institutions, graduation dates
  - **AI Interview Score:** If completed, shows score and link to recording
  - **Expectations:** Salary range, start date, remote preference, visa requirements
- [ ] Profile is **view-only** (recruiters cannot edit candidate data)
- [ ] "View in New Tab" button for detailed profile page
- [ ] Profile sections collapse/expand for easier navigation

### AC4: Timeline Events - Application & Profile Review

- [ ] **Application Received:**
  - Event card shows submission timestamp
  - Initial match score displayed
  - "View Submitted Application" link (shows candidate's submission snapshot)
  - Automatic event: "Your team received a new application"
- [ ] **Recruiter Viewed Profile:**
  - Shows timestamp when recruiter first opened application
  - Auto-logged event (no manual action needed)
  - Shows which recruiter viewed (if multiple recruiters on team)
- [ ] **Profile Score Calculated:**
  - Match score breakdown with visual indicators
  - "View Detailed Analysis" link to score explanation page
  - Comparison to average applicant score for this job

### AC5: Timeline Events - AI Interview Review

- [ ] **AI Interview Invitation Sent:**
  - Shows when system sent invitation to candidate
  - "Resend Invitation" button if needed
- [ ] **AI Interview Completed:**
  - Shows completion timestamp and score boost (+X points)
  - **"Review Interview"** button opens video player with:
    - Full interview recording (video + audio)
    - Real-time transcript with timestamps
    - AI-generated summary of candidate responses
    - Technical accuracy score (60%) and communication score (40%)
    - Question-by-question breakdown
  - Recruiter can add private notes while watching
  - "Mark as Reviewed" checkbox
- [ ] **Recruiter Reviewed Interview:**
  - Auto-logged event when recruiter finishes watching
  - Shows review duration (e.g., "Watched 18 min of 20 min interview")
  - Private notes visible to recruiting team only

### AC6: Timeline Events - Expectations Review

- [ ] **Expectations Submitted:**
  - Shows candidate's submitted expectations:
    - Expected salary range
    - Start date availability
    - Remote/hybrid/onsite preference
    - Visa sponsorship requirement
    - Other special requirements
  - **"Review Expectations"** button expands detailed view
  - Recruiter can add notes: "Salary aligned with budget" or "Start date too far out"
  - "Flag as Issue" button for misaligned expectations
- [ ] **Recruiter Reviewed Expectations:**
  - Auto-logged event when recruiter reviews
  - Shows recruiter's notes (visible to team only)
  - Alignment indicator (green: aligned, yellow: negotiable, red: misaligned)

### AC7: Timeline Events - Interview Scheduling (GMeet)

- [ ] **Schedule Interview** Action:
  - Recruiter clicks "Schedule Interview" button in quick actions
  - Modal opens with:
    - Interview stage dropdown (Phone Screen, Technical, Panel, Final Round)
    - Date/time picker with recruiter's calendar integration
    - Duration selector (30 min, 45 min, 1 hour, etc.)
    - Interviewers multi-select (if panel interview)
    - GMeet link auto-generated
    - Custom message to candidate (pre-filled template)
  - "Send Invitation" button creates timeline event and notifies candidate
- [ ] **Interview Scheduled:**
  - Event card shows interview details:
    - Stage, date/time, duration
    - GMeet link (clickable)
    - Interviewers list
    - Calendar event attached (.ics file)
  - "Reschedule" and "Cancel" buttons with candidate notification
  - Countdown timer until interview (if upcoming)
- [ ] **Candidate Accepted Interview:**
  - Shows timestamp of candidate acceptance
  - Confirmation message visible to recruiter
- [ ] **Candidate Declined Interview:**
  - Shows timestamp and candidate's reason (if provided)
  - "Offer Alternative Times" button to reschedule
- [ ] **Interview Completed:**
  - Shows completion timestamp
  - **Gemini AI Transcription** (auto-triggered):
    - GMeet recording sent to Gemini 1.5 Pro API for transcription
    - Transcript generated with speaker labels (Recruiter, Candidate)
    - AI analyzes transcript and generates draft feedback summary:
      - Key discussion points
      - Technical skills demonstrated
      - Communication quality assessment
      - Cultural fit indicators
      - Overall recommendation (Strong Yes → Strong No)
    - Auto-creates timeline event: "AI Feedback Generated"
  - **"Review AI Feedback"** button opens feedback form:
    - Shows full transcript (expandable, searchable by speaker)
    - AI-generated feedback draft (editable by recruiter)
    - Rating selector (1-5 stars)
    - Structured feedback sections (pre-filled by AI, editable):
      - Technical Skills
      - Communication & Clarity
      - Culture Fit
      - Problem-Solving Approach
    - Private notes textarea (for additional context)
    - Recommendation dropdown (pre-selected by AI, editable)
  - **"Approve & Save Feedback"** finalizes feedback (visible to hiring team only)
  - **"Regenerate AI Summary"** button allows re-analysis if needed
- [ ] **Multiple Interview Stages:**
  - Timeline shows sequential interview rounds (Phone → Technical → Panel → Final)
  - Each stage has its own event cards
  - Cannot schedule next stage until previous is completed and feedback submitted

### AC8: Timeline Events - Assignment Management

- [ ] **Give Assignment** Action:
  - Recruiter clicks "Give Assignment" button
  - Modal opens with:
    - Assignment title (e.g., "Backend API Design Challenge")
    - Assignment type dropdown (Coding, Case Study, Design, Presentation, Other)
    - Description textarea (instructions, requirements, deliverables)
    - Deadline date picker (1-7 days recommended)
    - **PDF link** (e.g., Google Drive, Dropbox link to assignment brief)
    - **External platform link** (e.g., HackerRank, CodeSignal, GitHub template)
  - "Send Assignment" button creates event and notifies candidate
- [ ] **Assignment Given:**
  - Event card shows assignment details:
    - Title, type, description
    - Deadline with countdown timer
    - PDF link (if provided)
    - External link (if provided)
  - "Extend Deadline" button (with candidate notification)
  - "Remind Candidate" button (sends gentle nudge)
- [ ] **Candidate Uploaded Assignment:**
  - Shows submission timestamp
  - **"Review Submission"** button opens:
    - Download link for candidate's files
    - Preview (if PDF/image)
    - External link (if candidate provided GitHub repo, etc.)
  - **"Add Feedback"** form:
    - Rating (1-5 stars)
    - Detailed feedback on quality, approach, completeness
    - Private notes for team
    - Decision: "Pass to Next Stage" or "Reject"
  - "Request Revision" option (sends feedback to candidate for resubmission)
- [ ] **Recruiter Reviewed Assignment:**
  - Auto-logged event with review timestamp
  - Feedback summary visible to team
  - Score/rating displayed
- [ ] **Multiple Assignment Stages:**
  - Timeline supports sequential assignments (Take-home → Follow-up → Final project)
  - Each assignment has independent tracking
  - Cannot give next assignment until previous is reviewed

### AC9: Timeline Events - Decision Stages

- [ ] **Moved to Next Round:**
  - Event logged when recruiter advances candidate
  - Shows which stage candidate moved to
  - Optional message to candidate
- [ ] **Application Rejected:**
  - Recruiter selects rejection reason from dropdown:
    - Not qualified for role
    - Position filled
    - Salary expectations misaligned
    - Culture fit concerns
    - Failed technical assessment
    - Other (custom reason)
  - Optional feedback message to candidate (auto-sent via email)
  - "Archive Application" checkbox
  - Rejection logged with timestamp and reason
- [ ] **Offer Extended:**
  - Event logged when offer is sent
  - Offer details summary (visible to team only)
  - Candidate acceptance/decline tracked
- [ ] **Application Withdrawn:**
  - Shows when candidate withdrew application
  - Candidate's reason (if provided)
  - "Re-engage" button to reach out to candidate

### AC10: Real-Time Updates & Collaboration

- [ ] Timeline auto-refreshes when candidate takes action (WebSocket updates)
- [ ] Multiple recruiters can view same timeline simultaneously
- [ ] "Currently viewing" indicator shows which team members are active
- [ ] Recruiter actions immediately visible to team members
- [ ] Activity log shows all recruiter interactions (viewed, reviewed, scheduled, etc.)
- [ ] Private notes section for internal team communication (not visible to candidate)

### AC11: Visibility & Permissions

- [ ] Recruiters see all candidate actions and all recruiter actions
- [ ] Recruiters see internal notes, feedback, and decisions (candidate does NOT)
- [ ] Candidate profile edits appear in timeline (e.g., "Candidate updated skills section")
- [ ] Admin users see all timeline events across all applications
- [ ] Timeline events cannot be deleted (audit compliance) but can be annotated

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Timeline Events Data Model:** (Shared with EP4-S12)

  ```typescript
  interface TimelineEvent {
    _id: ObjectId;
    applicationId: ObjectId;
    eventType: string; // 30+ event types
    actorId: ObjectId;
    actorRole: 'candidate' | 'recruiter' | 'system';
    timestamp: Date;
    metadata: {
      interviewDetails?: {
        stage: string;
        dateTime: Date;
        gmeetLink: string;
        interviewers: ObjectId[];
        feedback?: RecruiterFeedback;
      };
      assignmentDetails?: {
        title: string;
        type: string;
        deadline: Date;
        materialLink?: string;
        submissionLink?: string;
        feedback?: RecruiterFeedback;
      };
      statusChange?: {
        from: string;
        to: string;
        reason?: string;
      };
      notes?: string; // Private recruiter notes
    };
    visibleTo: ('candidate' | 'recruiter' | 'admin')[];
    isPrivate: boolean; // True for recruiter-only events
  }

  interface RecruiterFeedback {
    rating: number; // 1-5
    technicalScore?: number;
    communicationScore?: number;
    cultureFitScore?: number;
    feedback: string;
    recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
    reviewedBy: ObjectId;
    reviewedAt: Date;
  }
  ```

- [ ] **API Endpoints:**
  - `GET /api/recruiter/applications/:appId/timeline` - Fetch all events (including private)
  - `POST /api/recruiter/applications/:appId/schedule-interview` - Create interview event
  - `POST /api/recruiter/applications/:appId/give-assignment` - Create assignment event
  - `POST /api/recruiter/applications/:appId/add-feedback` - Add interview/assignment feedback
  - `PUT /api/recruiter/applications/:appId/status` - Change application status
  - `POST /api/recruiter/applications/:appId/reject` - Reject with reason
  - `POST /api/recruiter/applications/:appId/notes` - Add private note to timeline

- [ ] **GMeet Integration:**
  - Generate GMeet links via Google Calendar API
  - Create calendar events with GMeet conference details
  - Send calendar invitations to candidate and interviewers
  - Handle timezone conversions (candidate vs. recruiter timezone)

- [ ] **Assignment File Storage:**
  - Store assignment materials in secure file storage (S3-compatible)
  - Store candidate submissions with metadata (filename, size, upload date)
  - Generate temporary signed URLs for secure file access
  - Virus scan all uploaded files

### Frontend Implementation

- [ ] **Components:**
  - `RecruiterApplicationTimeline.tsx` - Main timeline container
  - `RecruiterTimelineHeader.tsx` - Sticky header with actions
  - `RecruiterProfileSidebar.tsx` - Collapsible profile view
  - `ScheduleInterviewModal.tsx` - Interview scheduling interface
  - `GiveAssignmentModal.tsx` - Assignment creation interface
  - `ReviewAIInterviewModal.tsx` - Video player with transcript
  - `ReviewAssignmentModal.tsx` - Assignment review interface
  - `AddFeedbackForm.tsx` - Structured feedback entry
  - `RejectCandidateModal.tsx` - Rejection reason selection
  - `TimelineEventCard.tsx` - Polymorphic event renderer (recruiter version)
  - `PrivateNotesSection.tsx` - Internal team communication

- [ ] **State Management:**
  - React Query for timeline data fetching
  - WebSocket hook for real-time candidate action updates
  - Local state for modal visibility and form inputs
  - Context for application metadata (shared across components)

- [ ] **Styling:**
  - Material-UI components with brand colors
  - Sticky header with shadow on scroll
  - Collapsible sidebar with smooth animations
  - Timeline connector lines color-coded by actor (blue: candidate, purple: recruiter)
  - Loading skeletons for async actions

### GMeet Integration Details

```typescript
// Google Calendar API integration for GMeet link generation
async function createInterviewEvent(interview: InterviewDetails) {
  const event = {
    summary: `Interview: ${interview.candidateName} - ${interview.jobTitle}`,
    description: `${interview.stage} interview for ${interview.jobTitle} position`,
    start: {
      dateTime: interview.startTime.toISOString(),
      timeZone: interview.timezone,
    },
    end: {
      dateTime: interview.endTime.toISOString(),
      timeZone: interview.timezone,
    },
    attendees: [
      { email: interview.candidateEmail },
      ...interview.interviewers.map(i => ({ email: i.email })),
    ],
    conferenceData: {
      createRequest: {
        requestId: generateUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    resource: event,
  });

  return response.data.hangoutLink; // GMeet link
}
```

### Testing

- [ ] **Unit Tests:**
  - Timeline event sorting and filtering
  - Private vs. public event visibility logic
  - Interview scheduling date/time validation
  - Assignment deadline calculation
  - Feedback form validation

- [ ] **Integration Tests:**
  - API endpoints return correct events with privacy filtering
  - GMeet link generation works correctly
  - File upload and download for assignments
  - WebSocket broadcasts recruiter actions to team
  - Status change triggers notification to candidate

- [ ] **E2E Tests:**
  - Recruiter schedules interview, candidate receives notification
  - Recruiter gives assignment, candidate uploads submission
  - Recruiter reviews AI interview and adds feedback
  - Recruiter rejects candidate with reason, candidate receives email
  - Multiple recruiters collaborate on same application timeline

---

## Dependencies

- **Requires:**
  - EP4-S12 (Timeline data model and event infrastructure)
  - Google Calendar API integration for GMeet links
  - File storage system for assignment materials
- **Blocks:** EP4-S14 (Share Profile uses timeline events)
- **Related:** EP4-S10 (Notifications alert recruiter of candidate actions)

---

## UX Considerations

### Consult UX Expert For:

- **Profile Sidebar:** Collapsible vs. split-screen vs. modal approach
- **Quick Actions:** Icon-only vs. text labels vs. icon+text
- **Timeline Density:** How much information per event card without overwhelming
- **Interview Scheduling:** Inline form vs. modal vs. multi-step wizard
- **Mobile Responsiveness:** Full timeline on mobile or condensed summary view
- **Loading States:** Skeleton patterns for timeline and profile
- **Action Feedback:** Toast notifications vs. inline confirmations
- **Private Notes:** Where to place (sidebar, inline, separate tab)

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard shortcuts for common actions (S: schedule, A: assignment, R: reject)
- Screen reader support for timeline navigation
- Focus management for modals and forms
- Color contrast for status indicators and action buttons

---

## Success Metrics

- **Efficiency:** 30% reduction in time-to-review per candidate (vs. multi-page navigation)
- **Action Completion:** 80% of recruiters use quick actions vs. navigating away
- **Collaboration:** 50% of applications reviewed by 2+ recruiters (team engagement)
- **Feedback Quality:** 90% of interviews and assignments have structured feedback
- **Candidate Experience:** 25% reduction in "What's my status?" inquiries from candidates

---

## Future Enhancements

- AI-powered interview scheduling (suggest optimal times based on both calendars)
- Bulk actions across multiple candidate timelines (schedule 5 interviews at once)
- Timeline templates for common hiring workflows
- Integration with ATS systems (Greenhouse, Lever) for bi-directional sync
- Candidate comparison mode (view 2-3 timelines side-by-side)
- Voice notes (recruiters can record audio feedback instead of typing)
- Video interviewing platform integration (Zoom, Microsoft Teams, not just GMeet)

---

## Notes

- Ensure calendar invite includes all necessary details (GMeet link, job title, stage)
- Assignment materials should be virus-scanned before candidate can download
- Private notes must be clearly marked to avoid accidental exposure to candidates
- Consider time zones carefully: display all times in recruiter's local timezone but store as UTC
- Provide "undo" functionality for critical actions (reject, disqualify) with 30-second window
