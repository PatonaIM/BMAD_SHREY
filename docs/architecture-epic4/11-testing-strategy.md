# 11. Testing Strategy

## MVP Approach: Manual Testing

**Decision**: Automated tests deferred to post-MVP to accelerate delivery.

**Manual Testing Checklist**:

1. **Recruiter Dashboard**
   - [ ] Dashboard loads with correct metrics (applications count, avg score, pending reviews)
   - [ ] Job filter updates metrics correctly
   - [ ] Recent activity feed displays latest events

2. **Google Chat Integration**
   - [ ] Webhook setup flow completes successfully
   - [ ] Test message sends correctly
   - [ ] Notification triggers on new application
   - [ ] Fallback to email when webhook fails

3. **Google Calendar Scheduling**
   - [ ] OAuth flow connects calendar successfully
   - [ ] Availability slots sync from Google Calendar
   - [ ] Call scheduling creates calendar event with meeting link
   - [ ] Candidate receives calendar invite

4. **Timeline Views**
   - [ ] Recruiter sees recruiter-only events + shared events
   - [ ] Candidate sees candidate-only events + shared events
   - [ ] No data leakage between roles
   - [ ] Events display in correct chronological order

5. **Inline Actions**
   - [ ] Quick feedback (star rating) saves immediately
   - [ ] UI updates optimistically before server response
   - [ ] Rollback occurs on server error with toast notification
   - [ ] Expanded detail panel shows full application info

6. **Gemini Transcription**
   - [ ] Call completes and queues transcription job
   - [ ] Polling shows "pending" → "processing" → "completed" states
   - [ ] Transcript and summary display correctly
   - [ ] Failed transcriptions show error message

7. **Mobile Responsive**
   - [ ] Dashboard usable on 375px width (iPhone SE)
   - [ ] Bottom sheets replace modals on mobile
   - [ ] Touch targets meet 44px minimum
   - [ ] Inline actions accessible on mobile

8. **Dark Mode**
   - [ ] All components render correctly in dark mode
   - [ ] No color contrast issues (WCAG AA minimum)
   - [ ] Toggle between light/dark works smoothly

**Browser Testing**:

- Chrome/Edge (primary)
- Safari (macOS/iOS)
- Firefox (secondary)

**Post-MVP Testing Plan**:
Once core functionality validated through manual testing, implement automated tests:

- Unit tests for services (GoogleChatAdapter, TimelineService, etc.)
- Integration tests for tRPC procedures
- E2E tests for critical user flows (Playwright)
- Target: 80% code coverage

---
