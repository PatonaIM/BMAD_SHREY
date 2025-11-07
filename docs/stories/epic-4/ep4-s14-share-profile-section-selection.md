# EP4-S14: Share Profile with Section Selection

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S14  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** to selectively share specific sections of a candidate's profile with stakeholders,  
**So that** I can provide relevant information to hiring managers without overwhelming them or exposing unnecessary details.

---

## Acceptance Criteria

### AC1: Share Profile Button & Modal

- [ ] "Share Profile" button visible in recruiter timeline sticky header (EP4-S13)
- [ ] Clicking button opens "Share Profile" modal with section selection interface
- [ ] Modal displays all available profile sections with checkboxes:
  - **Basic Info:** Name, email, phone, location
  - **Profile Summary:** Professional headline, bio
  - **Resume:** Original uploaded PDF
  - **Skills:** All skills with proficiency levels
  - **Experience:** Work history timeline
  - **Education:** Degrees and institutions
  - **AI Interview:** Recording, transcript, and AI score
  - **Expectations:** Salary, start date, work preferences
  - **Assignment Submissions:** All uploaded take-home assignments
  - **Interview Feedback:** Recruiter notes and ratings (internal only)
- [ ] "Select All" and "Deselect All" quick toggles
- [ ] Preview pane shows how selected sections will appear to recipient

### AC2: Recipient Configuration

- [ ] Email input field for stakeholder email addresses (comma-separated or multi-select)
- [ ] "Add Message" textarea for optional context/instructions
- [ ] Expiration date picker (default: 7 days, options: 1 day, 3 days, 7 days, 30 days, Never)
- [ ] "Require Login" toggle (if enabled, recipient must authenticate to view)
- [ ] "Allow Comments" toggle (if enabled, recipient can add feedback inline)

### AC3: Shareable Link Generation

- [ ] "Generate Link" button creates unique, secure shareable URL
- [ ] URL format: `https://teammatch.ai/shared-profiles/{uuid}`
- [ ] Link copied to clipboard automatically with confirmation toast
- [ ] Link also sent to specified email addresses
- [ ] Link metadata stored: creator, creation date, expiration, view count

### AC4: Shared Profile View (Recipient Experience)

- [ ] Recipient clicks link and lands on clean, branded profile view
- [ ] Only selected sections visible (no navigation to other data)
- [ ] Watermark or header indicates "Shared by [Recruiter Name] from TeamMatch"
- [ ] Sections displayed in professional layout with clear hierarchy
- [ ] AI Interview section shows video player (if selected)
- [ ] Assignment section shows download links for submissions
- [ ] No edit capabilities (read-only for recipients)
- [ ] Footer with "Powered by TeamMatch" and "Request Access to Full Platform" CTA

### AC5: Access Control & Security

- [ ] Link expires after specified time period (7 days default)
- [ ] Expired links show "This link has expired" message with contact info
- [ ] If "Require Login" enabled, recipient must sign in (or create free account)
- [ ] View tracking: logs timestamp, IP address, user agent for each access
- [ ] Recruiter can revoke link at any time (instant invalidation)
- [ ] Maximum 10 active shares per candidate profile (prevent abuse)

### AC6: Share Management Dashboard

- [ ] "Shared Profiles" section in recruiter dashboard
- [ ] Table/list view of all active shares:
  - Candidate name
  - Sections shared
  - Recipients (email addresses)
  - Created date
  - Expiration date
  - View count
  - Last viewed timestamp
- [ ] Quick actions: View, Revoke, Extend Expiration, Regenerate Link
- [ ] Filter by candidate, date created, expiration status
- [ ] Search by recipient email or candidate name

### AC7: Email Notification (Phase 2 - Future)

- [ ] Recipient receives email with:
  - Subject: "[Recruiter Name] shared a candidate profile with you"
  - Body: Custom message from recruiter + clickable link
  - Preview of candidate summary (name, job applied for, match score)
  - Expiration warning: "This link expires in X days"
- [ ] Email template professionally designed with TeamMatch branding
- [ ] Unsubscribe option for recipients (GDPR compliance)

### AC8: Analytics & Tracking

- [ ] Track share metrics:
  - Total shares created per recruiter
  - Average sections selected per share
  - View rate (% of shares that are accessed)
  - Average time spent on shared profile
  - Conversion: % of shares leading to candidate advancement
- [ ] Dashboard shows "Most shared sections" insight
- [ ] Candidate profile shows "Shared X times with Y stakeholders" indicator

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Data Model:**

  ```typescript
  interface SharedProfile {
    _id: ObjectId;
    candidateId: ObjectId;
    applicationId: ObjectId;
    recruiterId: ObjectId;
    shareToken: string; // UUID for URL
    selectedSections: string[]; // ['resume', 'aiInterview', 'skills', ...]
    recipientEmails: string[];
    customMessage?: string;
    expiresAt: Date;
    requiresLogin: boolean;
    allowComments: boolean;
    isActive: boolean; // False when revoked
    viewCount: number;
    lastViewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  interface SharedProfileView {
    _id: ObjectId;
    sharedProfileId: ObjectId;
    viewedAt: Date;
    ipAddress: string;
    userAgent: string;
    viewerEmail?: string; // If logged in
    duration?: number; // Seconds spent on page
  }
  ```

- [ ] **API Endpoints:**
  - `POST /api/recruiter/applications/:appId/share` - Create shareable link
  - `GET /api/shared-profiles/:token` - Fetch shared profile data (public endpoint)
  - `POST /api/shared-profiles/:token/track-view` - Log view event
  - `PUT /api/recruiter/shared-profiles/:id/revoke` - Revoke access
  - `PUT /api/recruiter/shared-profiles/:id/extend` - Extend expiration
  - `GET /api/recruiter/shared-profiles` - List all shares by recruiter
  - `DELETE /api/recruiter/shared-profiles/:id` - Delete share record

- [ ] **Security Implementation:**
  - Generate cryptographically secure UUID for share token (`crypto.randomUUID()`)
  - Validate expiration on every access attempt
  - Rate limiting on public share endpoint (10 requests/minute per IP)
  - Optional authentication middleware for "Require Login" shares
  - Audit logging for all share creation and access events

- [ ] **Data Aggregation:**
  - Dynamically assemble profile data based on selected sections
  - Exclude private/internal data (recruiter notes, internal scores)
  - Optimize queries to fetch only selected sections (avoid over-fetching)

### Frontend Implementation

- [ ] **Components:**
  - `ShareProfileModal.tsx` - Main modal with section selection
  - `SectionCheckboxList.tsx` - Multi-select section picker
  - `RecipientEmailInput.tsx` - Email address input with validation
  - `ShareLinkDisplay.tsx` - Generated link with copy button
  - `SharedProfileView.tsx` - Public-facing profile display (recipient view)
  - `ShareManagementDashboard.tsx` - List of active shares with actions
  - `SharedProfilePreview.tsx` - Preview pane in modal

- [ ] **State Management:**
  - React Query for share creation and management
  - Local state for section selection checkboxes
  - Clipboard API for copy-to-clipboard functionality
  - Toast notifications for success/error feedback

- [ ] **Styling:**
  - Modal uses Material-UI Dialog component
  - Checkbox list with clear labels and icons per section
  - Professional shared profile layout (not identical to internal view)
  - Watermark/banner on shared view indicating it's a shared link
  - Responsive design for mobile viewing

### Email Template (Future Enhancement)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Candidate Profile Shared with You</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <div
      style="background: linear-gradient(135deg, #A16AE8 0%, #8096FD 100%); padding: 20px; border-radius: 8px 8px 0 0;"
    >
      <h1 style="color: white; margin: 0;">TeamMatch</h1>
    </div>
    <div
      style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;"
    >
      <h2>{{recruiterName}} shared a candidate profile with you</h2>
      <p>{{customMessage}}</p>
      <div
        style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;"
      >
        <h3>{{candidateName}}</h3>
        <p><strong>Applied for:</strong> {{jobTitle}}</p>
        <p><strong>Match Score:</strong> {{matchScore}}%</p>
      </div>
      <a
        href="{{shareLink}}"
        style="display: inline-block; background: #A16AE8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 0;"
        >View Profile</a
      >
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This link expires on {{expirationDate}}. It has been viewed
        {{viewCount}} times.
      </p>
    </div>
  </body>
</html>
```

### Testing

- [ ] **Unit Tests:**
  - Share token generation (uniqueness, entropy)
  - Expiration date calculation
  - Section selection validation
  - Email address validation (format, duplicates)

- [ ] **Integration Tests:**
  - API creates share and returns valid link
  - Public endpoint returns only selected sections
  - Expired links return 403 Forbidden
  - Revoked links return 404 Not Found
  - View tracking logs correctly

- [ ] **E2E Tests:**
  - Recruiter selects sections and generates link
  - Recipient accesses link and sees selected sections only
  - Recipient cannot access non-selected sections (no URL hacking)
  - Recruiter revokes link, recipient sees expired message
  - Share count and view tracking updates in dashboard

### Performance Considerations

- [ ] Cache candidate profile data for shared links (5-minute TTL)
- [ ] Lazy load heavy assets (AI interview videos) on shared view
- [ ] Optimize database queries to fetch only selected sections
- [ ] CDN delivery for shared profile pages (edge caching)

---

## Dependencies

- **Requires:**
  - EP4-S13 (Recruiter timeline with "Share Profile" button)
  - Candidate profile data model (EP2)
  - AI interview recordings (EP3)
- **Blocks:** None (standalone feature)
- **Related:** EP4-S7 (Email notifications in future enhancement)

---

## UX Considerations

### Consult UX Expert For:

- **Section Selection UI:** Checkbox list vs. drag-and-drop builder
- **Preview Pane:** Real-time preview vs. static mockup
- **Recipient View:** Layout and information hierarchy
- **Mobile Experience:** How shared profiles display on mobile devices
- **Watermark Design:** Subtle but clear indication of shared content
- **Empty States:** When no sections selected, when link expired

### Accessibility Requirements

- WCAG 2.1 AA compliance for both modal and shared view
- Keyboard navigation for section selection
- Screen reader support for share link generation
- Focus management in modal
- High contrast for watermark/banner

---

## Success Metrics

- **Adoption:** 40% of recruiters use share feature within first month
- **Efficiency:** 50% reduction in "Can you send me the candidate info?" requests
- **Engagement:** 75% of shared links are viewed by recipients
- **Time Savings:** Average 10 minutes saved per hire (vs. manual email/attachment)
- **Conversion:** 30% of shared profiles lead to candidate advancement

---

## Future Enhancements

- **Email Delivery:** Send email with embedded profile preview (Phase 2)
- **Comments/Feedback:** Recipients can leave inline comments on sections
- **Comparison Shares:** Share multiple candidate profiles side-by-side
- **Custom Branding:** Enterprise clients can white-label shared views
- **Analytics Dashboard:** Detailed metrics on share effectiveness
- **PDF Export:** Generate PDF of selected sections for offline viewing
- **Integration with Slack/Teams:** Share directly to collaboration platforms
- **Expiration Reminders:** Notify recipients 24 hours before link expires

---

## Privacy & Compliance Notes

- **Candidate Consent:** Ensure candidates consent to profile sharing (in ToS)
- **GDPR Compliance:** Recipients in EU must be notified of data processing
- **Data Minimization:** Only share what's necessary for hiring decision
- **Audit Trail:** Maintain complete log of who accessed what data when
- **Right to be Forgotten:** If candidate deletes account, revoke all shares immediately

---

## Notes

- Consider adding "Share History" tab in candidate profile (recruiter view only)
- Watermark should be professional, not obtrusive (e.g., subtle header banner)
- Recipient view should feel like a curated portfolio, not a data dump
- For MVP, focus on link generation; email delivery can be Phase 2
- Monitor for abuse: recruiters sharing with competitors, excessive sharing, etc.
