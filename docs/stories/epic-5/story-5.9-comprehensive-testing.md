# Story 5.9: Comprehensive Testing & Bug Fixes

**Epic**: EP5 - Dynamic Multi-Stage Application Timeline System  
**Story Points**: 5  
**Priority**: P0  
**Sprint**: Sprint 4 (Weeks 7-8)  
**Status**: Draft

---

## 📋 Story Overview

Comprehensive end-to-end testing across all Epic 5 features, performance testing, security audit, bug fixes, and user acceptance testing (UAT) preparation for production deployment.

---

## 🎯 Acceptance Criteria

- ✅ All E2E tests passing
- ✅ No P0 or P1 bugs remaining
- ✅ Performance benchmarks met (<100ms API response, <50ms UI render)
- ✅ Security audit passed (no data leaks, proper authorization)
- ✅ UAT completed with stakeholder sign-off
- ✅ All browsers tested (Chrome, Firefox, Safari, Edge)
- ✅ Mobile testing completed (iOS, Android)
- ✅ Accessibility compliance (WCAG AA)

---

## 📦 Deliverables

### Testing Tasks

- [ ] **Task 1**: Happy Path E2E Tests
  - [ ] Complete journey: Submit → AI Interview → Assignment → Live Interview → Offer → Accepted → Onboarding
  - [ ] Multiple assignments (3) with feedback
  - [ ] Multiple live interviews (3) with feedback
  - [ ] Reschedule interview request (>24h)
  - [ ] Offer rejection by candidate

- [ ] **Task 2**: Error Scenario E2E Tests
  - [ ] File upload failure and retry
  - [ ] Calendar API failure during interview scheduling
  - [ ] Concurrent stage updates by recruiter
  - [ ] Network failure during stage transition
  - [ ] Invalid stage transition attempts
  - [ ] Max stages exceeded (assignments, interviews)

- [ ] **Task 3**: Permission & Authorization Tests
  - [ ] Candidate cannot see recruiter-only data
  - [ ] Candidate A cannot see candidate B's application
  - [ ] Non-recruiter cannot create stages
  - [ ] Disqualified application cannot be modified
  - [ ] Authorization checks on all tRPC procedures

- [ ] **Task 4**: Performance Testing
  - [ ] Timeline load time with 20+ stages (<100ms)
  - [ ] Application list query with 10K applications (<200ms)
  - [ ] File upload time for 5MB document (<10s)
  - [ ] Concurrent users (100) updating different applications
  - [ ] Database query performance with indexes

- [ ] **Task 5**: Security Audit
  - [ ] No data leaks between candidates
  - [ ] Proper authorization on all endpoints
  - [ ] Input validation on all procedures
  - [ ] XSS prevention (sanitize user input)
  - [ ] CSRF protection (tRPC handles this)
  - [ ] Rate limiting on file uploads
  - [ ] Secure file URLs (SAS tokens with expiry)

- [ ] **Task 6**: Accessibility Testing
  - [ ] Run axe-core on all components
  - [ ] Keyboard navigation works everywhere
  - [ ] Screen reader compatibility
  - [ ] Color contrast compliance (WCAG AA)
  - [ ] Focus management in modals
  - [ ] Alt text on all images/icons

- [ ] **Task 7**: Browser Compatibility Testing
  - [ ] Chrome (latest, -1 version)
  - [ ] Firefox (latest, -1 version)
  - [ ] Safari (latest, -1 version)
  - [ ] Edge (latest, -1 version)
  - [ ] Test all core flows in each browser

- [ ] **Task 8**: Mobile Testing
  - [ ] iOS Safari (latest iOS)
  - [ ] Android Chrome (latest Android)
  - [ ] Responsive design on 320px, 375px, 414px widths
  - [ ] Touch interactions work correctly
  - [ ] File upload from mobile works

- [ ] **Task 9**: Regression Testing
  - [ ] Existing features still work (Epic 1-4)
  - [ ] Profile creation and completion
  - [ ] Job application submission
  - [ ] AI interview functionality
  - [ ] Calendar integration (Epic 4)

- [ ] **Task 10**: Bug Triage & Fixes
  - [ ] Create bug tracking spreadsheet
  - [ ] Prioritize: P0 (blocker), P1 (critical), P2 (major), P3 (minor)
  - [ ] Fix all P0 and P1 bugs
  - [ ] Document P2/P3 bugs for post-launch

- [ ] **Task 11**: User Acceptance Testing (UAT)
  - [ ] Create UAT test plan
  - [ ] Recruit 5 internal testers (2 recruiters, 3 candidates)
  - [ ] Provide UAT environment (staging)
  - [ ] Collect feedback and bug reports
  - [ ] Iterate based on feedback
  - [ ] Get sign-off from stakeholders

- [ ] **Task 12**: Documentation Updates
  - [ ] Update API documentation
  - [ ] Update user guides (candidate + recruiter)
  - [ ] Create troubleshooting guide
  - [ ] Update FAQ
  - [ ] Record video tutorials (optional)

---

## 🔗 Dependencies

All stories 5.1-5.8 must be completed before this story begins.

---

## 🏗️ Testing Framework Setup

### E2E Testing with Playwright

```typescript
// tests/e2e/complete-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Application Journey', () => {
  test('Happy path: Submit to Onboarding', async ({ page }) => {
    // 1. Candidate submits application
    await page.goto('/jobs/job-123');
    await page.click('button:has-text("Apply Now")');
    await page.fill('input[name="coverLetter"]', 'I am very interested...');
    await page.click('button:has-text("Submit Application")');

    // 2. AI Interview (automated)
    await expect(page.locator('text=AI Interview')).toBeVisible();

    // 3. Recruiter gives assignment
    await page.goto('/recruiter/applications/app-123');
    await page.click('button:has-text("Give Assignment")');
    await page.fill('input[name="title"]', 'Technical Assignment');
    await page.fill('textarea[name="description"]', 'Build a REST API');
    await page.setInputFiles('input[type="file"]', 'test-assignment.pdf');
    await page.click('button:has-text("Create Assignment")');

    // 4. Candidate uploads answer
    await page.goto('/candidate/applications/app-123');
    await page.click('button:has-text("Upload Answer")');
    await page.setInputFiles('input[type="file"]', 'test-answer.pdf');
    await page.click('button:has-text("Submit")');

    // 5. Recruiter provides feedback
    await page.goto('/recruiter/applications/app-123');
    await page.click('button:has-text("Provide Feedback")');
    await page.click('[aria-label="4 stars"]');
    await page.fill('textarea[name="comments"]', 'Great work!');
    await page.click('button:has-text("Submit Feedback")');

    // 6. Recruiter schedules interview
    await page.click('button:has-text("Schedule Interview")');
    await page.click('[data-testid="slot-1"]');
    await page.click('button:has-text("Send Invite")');

    // 7. Candidate books slot
    await page.goto('/candidate/applications/app-123');
    await page.click('button:has-text("View Available Times")');
    await page.click('[data-testid="slot-1"]');
    await page.click('button:has-text("Confirm Booking")');

    // 8. Recruiter provides interview feedback
    await page.goto('/recruiter/applications/app-123');
    await page.click('button:has-text("Provide Feedback")');
    await page.click('[aria-label="5 stars"]');
    await page.fill('textarea[name="notes"]', 'Excellent!');
    await page.click('input[value="hire"]');
    await page.click('button:has-text("Submit Feedback")');

    // 9. Recruiter sends offer
    await page.click('button:has-text("Send Offer")');
    await page.setInputFiles('input[type="file"]', 'offer-letter.pdf');
    await page.click('button:has-text("Send Offer")');

    // 10. Candidate accepts offer
    await page.goto('/candidate/applications/app-123');
    await page.click('button:has-text("Accept Offer")');
    await page.click('button:has-text("Confirm")');

    // 11. Candidate uploads onboarding docs
    await expect(page.locator('text=Welcome to the team!')).toBeVisible();
    await page.setInputFiles('input[name="id_proof"]', 'id.pdf');
    await page.setInputFiles('input[name="education"]', 'degree.pdf');

    // 12. Verify journey complete
    await expect(page.locator('text=100% uploaded')).toBeVisible();
  });
});
```

### Performance Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
  },
};

export default function () {
  const res = http.get(
    'https://staging.example.com/api/trpc/stages.list?applicationId=app-123'
  );

  check(res, {
    'status is 200': r => r.status === 200,
    'response time < 200ms': r => r.timings.duration < 200,
  });

  sleep(1);
}
```

### Security Testing Checklist

```markdown
## Authorization Tests

- [ ] Candidate cannot access recruiter-only endpoints
- [ ] Candidate A cannot access candidate B's data
- [ ] Non-authenticated users redirected to login
- [ ] API endpoints require valid session token

## Input Validation

- [ ] File upload: size limits enforced (5MB)
- [ ] File upload: type restrictions enforced (PDF, images only)
- [ ] Text fields: max length enforced
- [ ] Email fields: format validation
- [ ] SQL injection: parameterized queries used
- [ ] XSS prevention: user input sanitized

## Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced in production
- [ ] Azure Storage: private containers with SAS tokens
- [ ] SAS tokens have short expiry (15 min)
- [ ] No API keys or secrets in client-side code

## Rate Limiting

- [ ] File upload: max 10 uploads per hour per user
- [ ] API calls: max 1000 requests per hour per user
- [ ] Login attempts: max 5 failed attempts per 15 min
```

---

## 🧪 Test Scenarios

### Happy Path Scenarios

1. **Complete Journey** (tested above)
2. **Multiple Assignments**: Give 3 assignments, candidate completes all
3. **Multiple Interviews**: Schedule 3 interviews, all completed
4. **Reschedule Interview**: Candidate requests reschedule (>24h), recruiter approves
5. **Offer Rejection**: Candidate rejects offer, application closes

### Error Scenarios

1. **File Upload Failure**: Network error during upload, user retries successfully
2. **Calendar API Failure**: Google Calendar unreachable, user sees error message
3. **Concurrent Updates**: Two recruiters update same application, last write wins
4. **Network Failure**: Intermittent connection during stage transition, retries automatically
5. **Invalid Transition**: User tries to skip from pending to completed, error shown

### Edge Cases

1. **Max Stages**: Try to create 4th assignment, error shown
2. **Reschedule Within 24h**: Button disabled with tooltip
3. **Disqualified Application**: Try to create stage, error shown
4. **Missing Required Fields**: Submit form with empty fields, validation errors
5. **Large File Upload**: Upload 6MB file, error shown

---

## 📊 Validation Checklist

Before marking this story complete:

- [ ] All 12 tasks completed
- [ ] All E2E tests passing (happy path + errors)
- [ ] Performance benchmarks met
- [ ] Security audit completed with no critical issues
- [ ] Accessibility tests passed (no violations)
- [ ] Browser compatibility confirmed (4 browsers)
- [ ] Mobile testing completed (iOS + Android)
- [ ] Regression tests passed (Epic 1-4 still work)
- [ ] All P0 and P1 bugs fixed
- [ ] UAT completed with stakeholder sign-off
- [ ] Documentation updated

---

## 🔄 Dev Agent Record

### Agent Model Used

_To be filled_

### Bug Tracking

_Document all bugs found and their status:_

| Bug ID  | Priority | Description | Status | Fixed In |
| ------- | -------- | ----------- | ------ | -------- |
| BUG-001 | P0       | ...         | Fixed  | PR #123  |
| BUG-002 | P1       | ...         | Fixed  | PR #124  |

### Performance Metrics

_Record actual performance results:_

- Timeline load (10 stages): \_\_ms (target: <50ms)
- Timeline load (20 stages): \_\_ms (target: <100ms)
- API response (stages.list): \_\_ms (target: <100ms)
- File upload (5MB): \_\_s (target: <10s)
- Concurrent users (100): \_\_ req/s (target: no errors)

### UAT Feedback

_Summarize feedback from UAT testers:_

1. Tester 1 (Recruiter): ...
2. Tester 2 (Recruiter): ...
3. Tester 3 (Candidate): ...
4. Tester 4 (Candidate): ...
5. Tester 5 (Candidate): ...

### File List

**Created:**

- [ ] E2E tests: `tests/e2e/*.spec.ts`
- [ ] Performance tests: `tests/performance/*.js`
- [ ] Security tests: `tests/security/*.test.ts`
- [ ] Accessibility tests: `tests/a11y/*.test.ts`
- [ ] Bug fix commits
- [ ] UAT test plan document
- [ ] Updated documentation

---

## 📝 Dev Notes

- Use Playwright for E2E tests (better than Cypress for this use case)
- Run tests in CI/CD pipeline on every PR
- Performance tests should run nightly on staging
- Security audit can use automated tools (OWASP ZAP) + manual review
- UAT should happen in staging environment (production-like data)
- Keep bug tracking spreadsheet updated daily

---

## 🔗 Related Stories

All stories 5.1-5.8 are dependencies for this story.

---

**Created**: 2025-01-27  
**Last Updated**: 2025-01-27
