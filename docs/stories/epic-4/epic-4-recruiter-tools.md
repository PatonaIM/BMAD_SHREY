# Epic 4: Advanced Application Management & Recruiter Tools – User Stories

**Last Updated:** November 7, 2025  
**Source:** `docs/prd.md` Epic 4. IDs EP4-S#  
**Status:** 🔴 0% Complete (0/13 stories completed)  
**Active Stories:** 9 (EP4-S9 through EP4-S17)  
**Deferred Stories:** 4 (EP4-S2, S5, S7, S8 - Phase 2+)

---

## Overview

Epic 4 focuses on advanced recruiter tools, application management workflows, and redesigned timeline-based application views for both candidates and recruiters. This epic transforms the platform into a complete hiring solution with Google Chat notifications, multi-stage interview/assignment workflows, candidate-initiated scheduling, and modern UX design.

### Key Features

1. **Recruiter Dashboard** - Job subscription management with Active/All/Closed tabs
2. **Google Chat Notifications** - Real-time and hourly digest notifications for recruiter activity
3. **Suggested Candidates** - Proactive matching with AI interview prioritization and unlimited invitations
4. **Timeline-Based Application Views** - Redesigned full-page timeline for candidates and recruiters
5. **Candidate Call Scheduling** - Self-service booking with recruiter availability slots
6. **Multi-Stage Workflows** - Sequential interview and assignment management with completion tracking
7. **Profile Sharing** - Selective section sharing with stakeholders
8. **Modern UX Design** - Complete design refresh with sticky headers and responsive layouts

---

## 🆕 New Stories (November 7, 2025)

### EP4-S9: Recruiter Dashboard with Job Management

**Status:** 🔴 Not Started  
**File:** [ep4-s9-recruiter-job-dashboard.md](./ep4-s9-recruiter-job-dashboard.md)

As a recruiter, I want to view and manage jobs across Active, All, and Closed categories with subscription capabilities, so that I can efficiently track jobs I'm responsible for.

**Key Features:**

- Three tabs: Active Jobs (subscribed), All Jobs, Closed Jobs
- Job subscription system (multiple recruiters can subscribe)
- Search and filtering by department, employment type, location
- Real-time subscription status updates

---

### EP4-S10: Google Chat Notification Integration

**Status:** 🔴 Not Started  
**File:** [ep4-s10-google-chat-notifications.md](./ep4-s10-google-chat-notifications.md)

As a recruiter, I want to receive real-time notifications via Google Chat for application events, so that I can respond quickly without constantly checking the dashboard.

**Key Features:**

- Webhook-based Google Chat integration
- Hourly application digest (aggregated new applications)
- Real-time notifications: AI interview completed, stage completions
- Notification preferences management (quiet hours, per-job settings)

---

### EP4-S11: Suggested Candidates Tab

**Status:** 🔴 Not Started  
**File:** [ep4-s11-suggested-candidates-tab.md](./ep4-s11-suggested-candidates-tab.md)

As a recruiter, I want to see suggested candidates who match job requirements but haven't applied yet, so that I can proactively source talent.

**Key Features:**

- Proactive matches (semantic similarity >70%, haven't applied)
- **Prioritize candidates who completed AI interviews** (shown first with badge)
- High scorers from other jobs (>75 score, >50% skill overlap)
- **Unlimited invitations** (no weekly limits)
- Match score breakdown and filtering

---

### EP4-S12: Application Timeline View - Candidate Perspective

**Status:** 🔴 Not Started  
**File:** [ep4-s12-application-timeline-candidate.md](./ep4-s12-application-timeline-candidate.md)

As a candidate, I want a visual timeline showing my application progress from submission through all hiring stages, so that I understand where I stand and what actions I need to take next.

**Key Features:**

- Full-page vertical timeline with event cards
- Sticky header with match score and quick actions
- Timeline events: Application, AI Interview, Expectations, Interviews, Assignments
- Real-time updates via WebSocket
- Candidate sees recruiter review actions (viewed profile, reviewed interview)

---

### EP4-S13: Application Timeline View - Recruiter Perspective

**Status:** 🔴 Not Started  
**File:** [ep4-s13-application-timeline-recruiter.md](./ep4-s13-application-timeline-recruiter.md)

As a recruiter, I want a comprehensive timeline view with embedded profile access and action capabilities, so that I can efficiently review candidates and take hiring actions without navigating between pages.

**Key Features:**

- Full-page timeline with sticky header (quick actions: View Profile, Disqualify, Share, Schedule, Message)
- Embedded read-only profile sidebar (collapsible)
- Schedule interviews with GMeet integration
- Give assignments with file upload/link submission
- Add structured feedback for interviews and assignments
- Private recruiter notes visible to team only

---

### EP4-S14: Share Profile with Section Selection

**Status:** 🔴 Not Started  
**File:** [ep4-s14-share-profile-section-selection.md](./ep4-s14-share-profile-section-selection.md)

As a recruiter, I want to selectively share specific sections of a candidate's profile with stakeholders, so that I can provide relevant information without overwhelming them.

**Key Features:**

- Section selection: Resume, Skills, AI Interview, Assignments, Experience, Education, Expectations
- Shareable secure link generation with expiration (1-30 days)
- View tracking (timestamp, IP, view count)
- Revoke access at any time
- Email stakeholders with link (future enhancement)

---

### EP4-S15: Multi-Stage Interview & Assignment Sequential Management

**Status:** 🔴 Not Started  
**File:** [ep4-s15-multi-stage-sequential-workflow.md](./ep4-s15-multi-stage-sequential-workflow.md)

As a recruiter, I want to schedule multiple sequential interview rounds and assignments in any order with completion tracking, so that I can implement complex hiring workflows.

**Key Features:**

- Unlimited sequential stages (Interview → Assignment → Interview → Assignment)
- Stage blocking: Cannot add Stage N+1 until Stage N completed
- Interview stages: GMeet integration, structured feedback, rating system
- Assignment stages: File upload, deadline tracking, revision requests
- Progress indicator showing workflow status (Stage 2 of 4 completed)

---

### EP4-S16: Application Page UX Design Refresh

**Status:** 🔴 Not Started  
**File:** [ep4-s16-application-page-ux-redesign.md](./ep4-s16-application-page-ux-redesign.md)

As a UX designer and product team, I want to completely redesign the application page with modern timeline layout, sticky headers, and role-specific views, so that both candidates and recruiters have intuitive experiences.

**Key Features:**

- UX expert consultation for wireframes, mockups, prototypes
- Sticky header design (candidate and recruiter variants)
- Timeline layout with color-coded events (blue: candidate, purple: recruiter)
- Responsive breakpoints: Desktop, Tablet, Mobile
- WCAG 2.1 AA accessibility compliance
- Performance optimization (FCP <1.5s, LCP <2.5s, TTI <3.5s)

---

### EP4-S17: Candidate-Initiated Call Scheduling

**Status:** 🔴 Not Started  
**File:** [ep4-s17-candidate-scheduler.md](./ep4-s17-candidate-scheduler.md)

As a candidate who has completed an AI interview, I want to book a call directly with the recruiter using their available time slots, so that I can discuss my application and demonstrate my interest without waiting for recruiter outreach.

**Key Features:**

- **Eligibility:** "Book a Call" button appears after AI interview completion
- Slot selection calendar (2-week rolling window)
- Recruiter availability management (weekly recurring + one-off slots)
- Google Calendar integration (auto-create events with GMeet links)
- Reminder emails (24 hours + 1 hour before call)
- Upcoming calls dashboard widget for recruiters
- No-show tracking and prevention (penalty system)

---

## Phase 2+ Stories (Deferred)

The following stories are planned for Phase 2 or later releases and are not currently prioritized:

### EP4-S2: Recruiter Analytics Dashboard

**Status:** 🔵 Phase 2  
**Deferred Reason:** Focus on core hiring workflows first; analytics valuable once we have sufficient data

As a hiring manager, I want analytics on candidate quality & funnel, so that I optimize strategy.

**Key Features:**

- Score distribution, time-to-hire, source effectiveness
- Conversion funnel visualization
- Recruiter performance metrics

---

### EP4-S5: Enterprise Integration & API Access

**Status:** 🔵 Phase 2  
**Deferred Reason:** Enterprise features needed after product-market fit

As an enterprise client, I want ATS/API integration, so that data flows into existing systems.

**Key Features:**

- REST API with authentication
- Webhooks for status changes
- SSO integration (Active Directory, Okta)
- Field mapping configuration

---

### EP4-S7: Reporting & Compliance

**Status:** 🔵 Phase 2  
**Deferred Reason:** Required for enterprise clients but not MVP

As an HR administrator, I want compliance & diversity reporting, so that we meet regulatory requirements.

**Key Features:**

- EEOC report generation
- Diversity funnel metrics
- Pay equity analysis
- Data retention policy enforcement

---

### EP4-S8: Premium Features & Monetization

**Status:** 🔵 Phase 2  
**Deferred Reason:** Business model implementation after user validation

As a platform administrator, I want tiered subscriptions & billing, so that we generate revenue.

**Key Features:**

- Tier gating (Basic, Professional, Enterprise)
- Subscription lifecycle management
- Usage analytics and limits
- Upgrade prompts and billing integration

---

## ❌ Removed Stories (Redundant or Not Applicable)

### ~~EP4-S1: Advanced Application Workflow Management~~

**Removed:** Covered by EP4-S15 (Multi-Stage Workflows) and EP4-S13 (bulk actions can be added as enhancement)

### ~~EP4-S3: Advanced Candidate Search & Discovery~~

**Removed:** Covered by EP4-S11 (Suggested Candidates includes search, filtering, and proactive discovery)

### ~~EP4-S4: Collaborative Hiring Team Tools~~

**Removed:** Covered by EP4-S13 (structured feedback, private notes) and EP4-S15 (interview/assignment ratings)

### ~~EP4-S6: Communication & Messaging~~

**Removed:** Email system not available; Google Chat notifications (EP4-S10) cover recruiter alerts. Email can be added in Phase 2 if needed.

---

## 📊 Epic 4 Story Summary

| Category                            | Count  | Stories                |
| ----------------------------------- | ------ | ---------------------- |
| **Active Stories (Current Sprint)** | 9      | EP4-S9 through EP4-S17 |
| **Phase 2+ Stories (Deferred)**     | 4      | EP4-S2, S5, S7, S8     |
| **Removed Stories (Redundant)**     | 4      | EP4-S1, S3, S4, S6     |
| **Total Stories**                   | **13** | 9 active + 4 deferred  |

---

Epic 4 MVP ready when EP4-S9 through EP4-S17 are completed. Phase 2 features (analytics, enterprise integration, compliance, monetization) will be prioritized based on customer feedback and market demand.
