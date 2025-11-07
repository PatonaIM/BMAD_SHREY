# EP4-S9: Recruiter Dashboard with Job Management

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S9  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** to view and manage jobs across different status categories (Active, All, Closed) with subscription capabilities,  
**So that** I can efficiently track jobs I'm responsible for and focus my recruiting efforts on relevant opportunities.

---

## Acceptance Criteria

### AC1: Dashboard Layout & Navigation

- [ ] Recruiter dashboard displays three primary tabs: **Active Jobs**, **All Jobs**, **Closed Jobs**
- [ ] Active Jobs tab shows only jobs the current recruiter has subscribed to
- [ ] All Jobs tab shows every job in the system regardless of subscription status
- [ ] Closed Jobs tab shows archived/completed jobs (read-only)
- [ ] Default landing view is Active Jobs tab

### AC2: Job Subscription System

- [ ] Each job card/row displays "Subscribe" button for unsubscribed jobs
- [ ] Each job card/row displays "Unsubscribe" button for subscribed jobs
- [ ] Multiple recruiters can subscribe to the same job simultaneously
- [ ] Subscription/unsubscription is immediate with optimistic UI update
- [ ] Subscription status persists across sessions and devices

### AC3: Job Display Information

- [ ] Job cards display: Job Title, Company (from Workable), Location, Posted Date, Number of Applications
- [ ] Subscribed jobs show "Active" badge or indicator
- [ ] Job cards are clickable to navigate to job detail page
- [ ] Empty state messaging when no jobs exist in a category

### AC4: Job Search & Filtering

- [ ] Search bar filters jobs by title, company, or location (real-time)
- [ ] Filter dropdown for Department (Engineering, Sales, Marketing, etc.)
- [ ] Filter dropdown for Employment Type (Full-time, Part-time, Contract, Remote)
- [ ] Sort options: Newest First, Most Applications, Alphabetical

### AC5: Multi-Recruiter Visibility

- [ ] Active Jobs tab shows only current recruiter's subscriptions
- [ ] All Jobs tab shows subscription indicators (e.g., "3 recruiters assigned")
- [ ] Hovering/clicking subscription indicator reveals which recruiters are subscribed
- [ ] Other recruiters' subscriptions don't affect "All Jobs" visibility

### AC6: Performance & UX

- [ ] Dashboard loads within 2 seconds under normal load
- [ ] Pagination or infinite scroll for jobs lists (20 jobs per page)
- [ ] Responsive design works on desktop, tablet, and mobile
- [ ] Loading states with skeleton screens during data fetch

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Database Schema:**
  - `jobSubscriptions` collection with fields: `jobId`, `recruiterId`, `subscribedAt`, `isActive`
  - Composite index on `jobId + recruiterId` for fast lookups
  - Soft-delete support for unsubscribe (set `isActive: false`)

- [ ] **API Endpoints:**
  - `POST /api/recruiter/jobs/:jobId/subscribe` - Subscribe to job
  - `DELETE /api/recruiter/jobs/:jobId/unsubscribe` - Unsubscribe from job
  - `GET /api/recruiter/jobs/active` - Fetch current recruiter's subscribed jobs
  - `GET /api/recruiter/jobs/all` - Fetch all jobs with subscription indicators
  - `GET /api/recruiter/jobs/closed` - Fetch archived jobs

- [ ] **Authorization:**
  - Middleware validates user has `recruiter` or `admin` role
  - Rate limiting: 100 requests/minute per recruiter
  - Input validation with Zod schemas

### Frontend Implementation

- [ ] **Components:**
  - `RecruiterDashboard.tsx` - Main dashboard container
  - `JobsTabNavigation.tsx` - Tab switcher (Active/All/Closed)
  - `RecruiterJobCard.tsx` - Individual job display with subscribe button
  - `JobSearchFilters.tsx` - Search and filter controls
  - `SubscriptionIndicator.tsx` - Shows recruiter assignment count

- [ ] **State Management:**
  - React Query for data fetching and cache invalidation
  - Optimistic updates for subscribe/unsubscribe actions
  - Error boundary for graceful failure handling

- [ ] **Styling:**
  - Material-UI card components with brand colors (#A16AE8, #8096FD)
  - Consistent spacing and typography with existing design system
  - Hover effects and visual feedback for interactive elements

### Testing

- [ ] **Unit Tests:**
  - Subscription logic (add/remove/toggle)
  - Filter and search functionality
  - Multi-recruiter scenarios

- [ ] **Integration Tests:**
  - API endpoint responses with mock data
  - Authorization checks for recruiter-only access
  - Database constraint validation (unique subscriptions)

- [ ] **E2E Tests (Playwright):**
  - Recruiter can subscribe to job and see it in Active Jobs
  - Recruiter can unsubscribe and job moves to All Jobs
  - Multiple recruiters can subscribe to same job
  - Search and filters work correctly across tabs

### Documentation

- [ ] API endpoint documentation in OpenAPI spec
- [ ] Component Storybook stories for visual testing
- [ ] User guide update: "How to Manage Active Jobs"

---

## Technical Notes

### Database Schema Example

```typescript
interface JobSubscription {
  _id: ObjectId;
  jobId: ObjectId; // Reference to jobs collection
  recruiterId: ObjectId; // Reference to users collection (recruiter role)
  subscribedAt: Date;
  isActive: boolean; // Soft-delete flag
  notificationsEnabled: boolean; // For future Google Chat integration
}
```

### Performance Considerations

- Index strategy: `{ jobId: 1, recruiterId: 1, isActive: 1 }` for fast lookups
- Aggregate queries to show subscription counts in All Jobs view
- Client-side caching with React Query (5-minute stale time)

### Edge Cases

- Recruiter subscribes to job that gets closed → Move to Closed Jobs automatically
- Recruiter account deactivated → Subscriptions remain but no access
- Job deleted from Workable → Mark as closed, preserve subscription history

---

## Dependencies

- **Blocks:** EP4-S10 (Google Chat notifications need subscription data)
- **Requires:** Workable job sync (EP1-S4) must be functional
- **Related:** EP4-S11 (Suggested Candidates will show on job detail pages)

---

## UX Considerations

### Consult UX Expert For:

- Optimal tab layout (horizontal tabs vs. vertical sidebar)
- Subscribe button placement and visual treatment
- Empty state messaging and illustrations
- Mobile responsiveness strategy for job cards
- Subscription indicator design (badge vs. icon vs. tooltip)

### Accessibility Requirements

- WCAG 2.1 AA compliance for all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader announcements for subscribe/unsubscribe actions
- Sufficient color contrast for status badges

---

## Success Metrics

- **Adoption:** 80% of recruiters subscribe to at least 3 jobs within first week
- **Efficiency:** Average time to find and subscribe to job < 30 seconds
- **Engagement:** 90% of active recruiters log in at least 3x per week
- **Error Rate:** < 1% failed subscription actions

---

## Notes

- Future enhancement: Bulk subscribe (select multiple jobs at once)
- Future enhancement: Job assignment by admin (force-subscribe recruiters)
- Consider adding "Favoriting" separate from subscription for job bookmarking
