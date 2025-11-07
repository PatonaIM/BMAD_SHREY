# Epic 4 Expansion Summary - November 7, 2025

## Overview

Successfully structured and documented **8 new comprehensive user stories** for Epic 4 based on your requirements for recruiter dashboard, application timeline redesign, and Google Chat notifications.

---

## ✅ New User Stories Created

### **EP4-S9: Recruiter Dashboard with Job Management**

📁 [ep4-s9-recruiter-job-dashboard.md](./ep4-s9-recruiter-job-dashboard.md)

**What:** Recruiter dashboard with Active/All/Closed jobs tabs and subscription system

**Key Features:**

- Job subscription (multiple recruiters can assign themselves to jobs)
- Active Jobs tab shows only subscribed jobs
- All Jobs tab shows everything with subscription indicators
- Search and filtering (department, employment type, location)

**Technical Highlights:**

- `jobSubscriptions` collection with composite index
- REST API endpoints for subscribe/unsubscribe
- React Query for optimistic updates

---

### **EP4-S10: Google Chat Notification Integration**

📁 [ep4-s10-google-chat-notifications.md](./ep4-s10-google-chat-notifications.md)

**What:** Real-time Google Chat notifications for recruiter activity

**Key Features:**

- **Hourly digest:** New applications aggregated (sent every hour on the hour)
- **Real-time events:** AI interview completed, stage completions, expectations submitted
- Webhook-based integration (recruiters provide their Google Chat webhook URL)
- Notification preferences (quiet hours, per-job settings)

**Technical Highlights:**

- Background job queue for notification processing
- Google Chat Card format (v2) for rich messages
- Encrypted webhook URL storage
- Retry logic for failed deliveries (3 attempts with exponential backoff)

---

### **EP4-S11: Suggested Candidates Tab**

📁 [ep4-s11-suggested-candidates-tab.md](./ep4-s11-suggested-candidates-tab.md)

**What:** Proactive candidate discovery for jobs

**Key Features:**

- **Proactive Matches:** Candidates with >70% match score who haven't applied
- **High Scorers from Other Jobs:** Previous applicants with >75 score and >50% skill overlap
- "Invite to Apply" functionality with email notifications
- Filtering by location, experience, availability, match score

**Technical Highlights:**

- Vector search for semantic matching
- Cross-job application analysis
- Invitation tracking system
- Limit 20 invitations per job per week (spam prevention)

---

### **EP4-S12: Application Timeline View - Candidate Perspective**

📁 [ep4-s12-application-timeline-candidate.md](./ep4-s12-application-timeline-candidate.md)

**What:** Full-page timeline showing candidate's application journey

**Key Features:**

- Vertical timeline with all events (application, AI interview, expectations, interviews, assignments)
- Sticky header with match score and quick actions (View Profile, Withdraw, Download PDF)
- Real-time updates via WebSocket
- Candidate sees recruiter actions (viewed profile, reviewed interview)
- Role-based visibility (candidate sees their actions + recruiter review actions)

**Technical Highlights:**

- Timeline events data model with visibility controls (`visibleTo: ['candidate', 'recruiter']`)
- WebSocket subscriptions for real-time event streaming
- Auto-scroll to unread events on page load
- PDF export capability

---

### **EP4-S13: Application Timeline View - Recruiter Perspective**

📁 [ep4-s13-application-timeline-recruiter.md](./ep4-s13-application-timeline-recruiter.md)

**What:** Comprehensive timeline with embedded profile and action capabilities

**Key Features:**

- Full-page timeline with sticky header (View Profile, Disqualify, Share, Schedule, Message)
- **Embedded profile sidebar** (read-only, collapsible): Summary, Skills, Experience, Education, AI Interview, Expectations
- **Schedule interviews:** GMeet link generation, calendar integration, interviewer selection
- **Give assignments:** File upload, deadline tracking, external link support (HackerRank, etc.)
- **Add structured feedback:** Rating (1-5), technical/communication scores, written feedback, recommendation
- Private recruiter notes (visible to team only, NOT candidates)

**Technical Highlights:**

- Google Calendar API integration for GMeet link generation
- File storage for assignment materials (virus scanning)
- Structured feedback data model with ratings and recommendations
- Multi-recruiter collaboration support

---

### **EP4-S14: Share Profile with Section Selection**

📁 [ep4-s14-share-profile-section-selection.md](./ep4-s14-share-profile-section-selection.md)

**What:** Selectively share candidate profile sections with stakeholders

**Key Features:**

- Section selection modal: Resume, Skills, AI Interview, Assignments, Experience, Education, Expectations
- Shareable secure link generation (UUID-based)
- Expiration settings (1 day, 3 days, 7 days, 30 days, Never)
- View tracking (timestamp, IP address, view count)
- Revoke access at any time
- "Require Login" toggle for sensitive shares

**Technical Highlights:**

- `SharedProfile` collection with secure tokens
- Public endpoint for shared profile access (rate limited)
- Audit logging for all views
- Email notifications (Phase 2 future enhancement)

---

### **EP4-S15: Multi-Stage Interview & Assignment Sequential Management**

📁 [ep4-s15-multi-stage-sequential-workflow.md](./ep4-s15-multi-stage-sequential-workflow.md)

**What:** Sequential multi-stage hiring workflows with completion tracking

**Key Features:**

- Unlimited sequential stages: Interview → Assignment → Interview → Assignment (any order)
- **Stage blocking:** Cannot add Stage N+1 until Stage N is completed
- Interview stages: GMeet integration, structured feedback, rating system
- Assignment stages: File upload, deadline tracking, revision requests ("Request Revision" loops back to Active)
- Progress indicator: "Stage 2 of 4 In Progress"
- Each stage has status tracking: Pending → Scheduled/Active → In Progress → Completed

**Technical Highlights:**

- `HiringStage` data model with `stageNumber`, `stageType`, `status`
- Business logic: `canAddNextStage()`, `isStageComplete()`
- Interview feedback and assignment feedback as nested objects
- Sequential enforcement at API level (validation)

---

### **EP4-S16: Application Page UX Design Refresh**

📁 [ep4-s16-application-page-ux-redesign.md](./ep4-s16-application-page-ux-redesign.md)

**What:** Comprehensive UX redesign consultation and implementation

**Key Features:**

- **UX expert consultation:** Wireframes, mockups, prototypes, design system
- **Sticky header design:** Candidate and recruiter variants with quick actions
- **Timeline layout:** Vertical timeline with color-coded events (blue: candidate, purple: recruiter)
- **Responsive breakpoints:** Desktop (1920px, 1440px, 1024px), Tablet (768px), Mobile (375px, 320px)
- **Accessibility:** WCAG 2.1 AA compliance (4.5:1 contrast, 44px touch targets, keyboard nav, screen reader support)
- **Performance:** FCP <1.5s, LCP <2.5s, TTI <3.5s, CLS <0.1

**UX Expert Topics:**

- Timeline layout (vertical vs. horizontal, event card design)
- Sticky header (full-width vs. centered, quick actions placement)
- Profile sidebar (collapsible vs. modal vs. overlay)
- Status indicators (badge style, color psychology, animations)
- Responsive strategy (mobile-first vs. desktop-first)

---

## 📊 Epic 4 Summary

| Metric            | Before | After                                 |
| ----------------- | ------ | ------------------------------------- |
| **Total Stories** | 8      | 16                                    |
| **Completion**    | 5%     | 5% (0 stories completed)              |
| **New Stories**   | 0      | 8                                     |
| **Documentation** | Basic  | Comprehensive (1000+ lines per story) |

---

## 📁 File Structure

```
docs/stories/epic-4/
├── README.md
├── epic-4-recruiter-tools.md (updated with new stories)
├── ep4-s9-recruiter-job-dashboard.md ✅ NEW
├── ep4-s10-google-chat-notifications.md ✅ NEW
├── ep4-s11-suggested-candidates-tab.md ✅ NEW
├── ep4-s12-application-timeline-candidate.md ✅ NEW
├── ep4-s13-application-timeline-recruiter.md ✅ NEW
├── ep4-s14-share-profile-section-selection.md ✅ NEW
├── ep4-s15-multi-stage-sequential-workflow.md ✅ NEW
└── ep4-s16-application-page-ux-redesign.md ✅ NEW
```

---

## 🔑 Key Technical Decisions

### 1. **Sequential Stage Enforcement**

- **Decision:** Stages must be completed sequentially (cannot skip)
- **Rationale:** Ensures hiring process integrity, prevents incomplete evaluations
- **Implementation:** API-level validation with `canAddNextStage()` business logic

### 2. **Google Chat Webhook Architecture**

- **Decision:** Direct webhook integration (not OAuth-based)
- **Rationale:** Simpler for MVP, recruiters already have webhook URLs
- **Implementation:** Encrypted webhook URL storage, retry queue for failed deliveries

### 3. **Timeline Event Visibility**

- **Decision:** Role-based visibility (`visibleTo: ['candidate', 'recruiter']`)
- **Rationale:** Candidates should see recruiter review actions but NOT internal feedback
- **Implementation:** `isPrivate` flag on timeline events, filtered API responses

### 4. **Profile Sharing Security**

- **Decision:** UUID-based tokens with expiration (not JWT)
- **Rationale:** Simpler revocation, easier view tracking
- **Implementation:** `SharedProfile` collection with secure token generation

### 5. **Multi-Stage Data Model**

- **Decision:** Polymorphic `HiringStage` model (interview vs. assignment details)
- **Rationale:** Flexible structure supports future stage types (e.g., skill tests, presentations)
- **Implementation:** `interviewDetails` and `assignmentDetails` as optional nested objects

---

## 🎯 Implementation Priority (Recommended Order)

1. **EP4-S16:** UX Design Refresh (blocks UI implementation of other stories)
2. **EP4-S9:** Recruiter Dashboard (foundation for other features)
3. **EP4-S12 & EP4-S13:** Timeline Views (core application page redesign)
4. **EP4-S15:** Multi-Stage Workflows (enables complex hiring processes)
5. **EP4-S10:** Google Chat Notifications (high-value recruiter feature)
6. **EP4-S11:** Suggested Candidates (proactive sourcing capability)
7. **EP4-S14:** Profile Sharing (nice-to-have for stakeholder collaboration)

---

## ⚠️ Critical Dependencies

### **EP4-S16 (UX Design) must be completed before:**

- EP4-S12 (Candidate Timeline UI)
- EP4-S13 (Recruiter Timeline UI)
- Any other UI implementation stories

### **EP4-S12 & EP4-S13 (Timeline Views) must be completed before:**

- EP4-S15 (Multi-Stage Workflows) - relies on timeline display
- EP4-S14 (Profile Sharing) - shares timeline content

### **EP4-S9 (Recruiter Dashboard) should be completed early:**

- EP4-S10 (Google Chat) - uses job subscription data
- EP4-S11 (Suggested Candidates) - accessed from job detail pages

---

## 🚀 Next Steps

1. **Review:** Product team reviews all 8 new stories for accuracy and completeness
2. **Prioritize:** Decide which stories to tackle first (recommend EP4-S16 → EP4-S9 → EP4-S12/S13)
3. **Estimate:** Engineering team estimates story points for each story
4. **Design:** Engage UX expert for EP4-S16 (Application Page UX Redesign)
5. **Sprint Planning:** Break stories into smaller tasks and assign to sprint backlog

---

## 📝 Story Quality Checklist

✅ All stories have comprehensive acceptance criteria (10+ AC per story)  
✅ Definition of Done includes backend, frontend, testing, and documentation requirements  
✅ Technical notes provide implementation guidance (data models, API endpoints, algorithms)  
✅ Dependencies clearly identified (requires, blocks, related)  
✅ UX considerations documented (consult UX expert topics)  
✅ Accessibility requirements specified (WCAG 2.1 AA)  
✅ Success metrics defined for measuring feature adoption  
✅ Future enhancements captured for roadmap planning

---

## 📚 Additional Documentation

- **Main PRD:** [docs/prd.md](../../prd.md) - Product Requirements Document
- **Epic 4 Overview:** [docs/stories/epic-4/epic-4-recruiter-tools.md](./epic-4-recruiter-tools.md)
- **Stories README:** [docs/stories/README.md](../README.md)

---

**Questions or clarifications needed?** Let me know! I'm ready to refine any story or dive deeper into specific technical requirements. 🎯
