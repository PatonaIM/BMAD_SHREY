# 14. Next Steps

## Immediate Actions (Week 1)

1. **Initialize Collections**:

   ```bash
   # Run migration script
   npm run migrate:epic4
   ```

   Creates 5 new collections with indexes.

2. **Set Up Google APIs**:
   - Register app in Google Cloud Console
   - Enable Chat API + Calendar API v3
   - Configure OAuth consent screen
   - Add redirect URI to NextAuth config

3. **Environment Setup**:
   ```env
   GOOGLE_CALENDAR_CLIENT_ID=xxx
   GOOGLE_CALENDAR_CLIENT_SECRET=xxx
   GEMINI_API_KEY=xxx
   REDIS_URL=redis://localhost:6379
   ```

## Development Sequence (Weeks 2-4)

**Week 2: Core Services**

- Implement `GoogleChatAdapter` (simplest integration)
- Build `TimelineService` with role-based projection
- Create `recruiterRouter` with dashboard procedure
- **Manual Test**: Chat webhook setup + test message

**Week 3: UI Components**

- `RecruiterDashboard` with metrics cards
- `ApplicationCard` with inline actions
- `TimelineView` (dual-perspective)
- **Manual Test**: Dashboard loads, inline actions work, timeline filtering

**Week 4: Advanced Features**

- `GoogleCalendarService` with OAuth flow
- `GeminiTranscriptionService` with BullMQ
- `SchedulingPanel` component
- **Manual Test**: Calendar sync, call scheduling, transcription polling

## Testing & Deployment (Week 5)

- **Manual testing** of all workflows (see Section 11)
- Cross-browser validation (Chrome, Safari, Firefox, Edge)
- Mobile device testing (iPhone SE, iPad, Android)
- Deploy to Vercel staging
- Monitor with Sentry
- **Post-MVP**: Implement automated tests (80% coverage target)

## Recommended Start Story

**Story 4.1: Recruiter Dashboard** - Establishes foundation for all other stories. Delivers immediate value (metrics visibility) while setting up routing, authentication, and component patterns for subsequent work.

---

**Document Status**: Ready for implementation. All architectural decisions documented with rationale and trade-offs.

_Prepared by Winston (Architect) | 2025-11-07_
