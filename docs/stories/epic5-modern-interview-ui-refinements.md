# Epic 5: Modern Interview UI Refinements & Session Management

**Epic ID**: EP5 (Stories 14-20)  
**Status**: Planning  
**Priority**: High  
**Target Completion**: Sprint 3-4

## Overview

This epic focuses on refining the V2 interview experience with critical UX improvements, visual enhancements, and robust session lifecycle management. The work addresses user feedback on UI clutter, adds an engaging 3D avatar, and implements proper backend session tracking for analytics and future resumption features.

## Business Goals

1. **Reduce Interview Abandonment**: Clean, focused UI keeps candidates engaged
2. **Increase Completion Rate**: Clear start/end flows reduce confusion
3. **Enable Analytics**: Session tracking provides data for optimization
4. **Enhance Brand Perception**: 3D avatar makes experience memorable and modern
5. **Support Compliance**: Persistent session data aids audit trails

## User Personas

- **Primary**: Job candidates taking technical interviews
- **Secondary**: Hiring managers reviewing interview recordings (future)
- **Tertiary**: System administrators monitoring platform health

## Success Metrics

| Metric                         | Current | Target | Measurement                                      |
| ------------------------------ | ------- | ------ | ------------------------------------------------ |
| Interview completion rate      | 78%     | 90%    | Sessions with `status=completed` / total started |
| Average score screen load time | N/A     | <1s    | P95 latency from completion → score display      |
| UI bug reports (start button)  | 5/week  | 0      | Support tickets tagged "interview-ui"            |
| Avatar render success rate     | N/A     | 95%    | 3D canvas loaded / total attempts                |
| Session data capture rate      | 0%      | 100%   | Sessions in DB / frontend starts                 |

## Story Breakdown

### Phase 1: Core UX Fixes (Sprint 3, Week 1)

- **EP5-S14**: Interview Start State Bugfix ⚡ _Critical_
  - **Effort**: 2 points
  - **Priority**: P0 (blocks user flow)
  - **Fixes**: Start button doesn't hide after click

- **EP5-S17**: Conditional Device Info & Feed Removal 🧹
  - **Effort**: 3 points
  - **Priority**: P1 (UX improvement)
  - **Removes**: Clutter from interview screen

### Phase 2: Visual Enhancements (Sprint 3, Week 2)

- **EP5-S15**: Split-Screen Layout Refactor 🎨
  - **Effort**: 5 points
  - **Priority**: P1 (enables S16)
  - **Delivers**: 50/50 candidate|AI layout

- **EP5-S16**: ReadyPlayerMe Avatar Integration 🤖
  - **Effort**: 8 points
  - **Priority**: P1 (high user impact)
  - **Delivers**: Animated 3D AI interviewer

### Phase 3: Session Management (Sprint 4, Week 1)

- **EP5-S18**: Start Session API Integration 🔌
  - **Effort**: 5 points
  - **Priority**: P0 (required for tracking)
  - **Delivers**: Backend session creation

- **EP5-S19**: End Interview Button & Early Termination ⛔
  - **Effort**: 3 points
  - **Priority**: P1 (user control)
  - **Delivers**: Graceful exit with confirmation

### Phase 4: Results Display (Sprint 4, Week 2)

- **EP5-S20**: Dedicated Score Screen Navigation 📊
  - **Effort**: 5 points
  - **Priority**: P1 (completion flow)
  - **Delivers**: Polished results page

**Total Effort**: 31 story points (~2 sprints for 2-person team)

## Dependencies

### Critical Path

```
S14 (Bugfix) → S15 (Layout) → S16 (Avatar)
                   ↓
S18 (Start API) → S19 (End Button) → S20 (Score Screen)
```

### Parallel Work

- S17 (UI Cleanup) can run parallel with S15
- S18 (API) can start while S16 (Avatar) is in progress

## Technical Architecture

### Frontend Components (New/Modified)

```
src/components/interview/v2/
├── ModernInterviewPage.tsx         # Modified: Layout, navigation
├── AIAvatarCanvas.tsx              # New: Three.js avatar renderer
├── EndInterviewModal.tsx           # New: Confirmation dialog
├── ScoreCard.tsx                   # New: Results display
└── useInterviewController.ts       # Modified: Session API calls
```

### Backend API Routes (New)

```
src/app/api/interview/
├── start-session/route.ts          # POST: Create session record
└── end-session/route.ts            # POST: Mark session complete
```

### Database Collections

```
MongoDB: interviewSessions
- sessionId (UUID, indexed)
- applicationId (string, indexed)
- status (enum: in_progress | completed | abandoned)
- startedAt, completedAt (Date)
- finalScore, scoreBreakdown (numbers)
- events[] (array of timestamped actions)
```

## Infrastructure Requirements

- **CDN**: Host ReadyPlayerMe GLB files (S16)
- **MongoDB**: Add `interviewSessions` collection with indexes (S18)
- **Environment Variables**:
  - `INTERVIEW_SESSION_SECRET` (JWT signing)
  - `READYPLAYERME_AVATAR_URL` (optional, for S16)

## Risk Assessment

| Risk                                | Probability | Impact | Mitigation                       |
| ----------------------------------- | ----------- | ------ | -------------------------------- |
| Three.js bundle size bloat          | Medium      | High   | Lazy load, use dynamic imports   |
| Avatar loading slow on 3G           | High        | Medium | Show fallback image, preload GLB |
| Session API downtime                | Low         | High   | Offline mode fallback (S18)      |
| Start button fix breaks other flows | Low         | High   | Comprehensive integration tests  |
| Browser WebGL incompatibility       | Medium      | Medium | Detect and fallback to 2D (S16)  |

## Rollout Plan

### Feature Flags

```yaml
ENABLE_SPLIT_SCREEN_LAYOUT: true # S15
ENABLE_3D_AVATAR: true # S16, gradual rollout
ENABLE_SESSION_TRACKING: true # S18, required for analytics
```

### Rollout Phases

1. **Alpha (5%)**: Internal team testing (1 week)
2. **Beta (25%)**: Selected candidates with opt-in (2 weeks)
3. **GA (100%)**: Full production rollout

### Rollback Criteria

- Avatar render failures >10%
- Session API error rate >5%
- Interview completion rate drops >5%
- User-reported bugs >2 P0 issues

## Testing Strategy

### Automated Tests

- **Unit**: 45 new tests (component logic, API handlers)
- **Integration**: 12 scenarios (full interview flows)
- **E2E**: 6 critical paths (start → conduct → end → score)
- **Visual Regression**: 8 screenshots (layout, avatar states)

### Manual QA Checklist

- [ ] Start button hides after click (S14)
- [ ] Split screen maintains aspect ratio on resize (S15)
- [ ] Avatar animates when AI speaks (S16)
- [ ] Device card hides after start (S17)
- [ ] Session ID created in database (S18)
- [ ] End button shows confirmation modal (S19)
- [ ] Score screen displays correct data (S20)
- [ ] Cross-browser: Chrome, Safari, Firefox, Edge
- [ ] Mobile responsive: iOS Safari, Chrome Android

## Documentation Updates

### User-Facing

- FAQ: "How do I end the interview early?"
- FAQ: "What do the score metrics mean?"
- Help Center: "Interview Experience Overview" (with avatar screenshot)

### Developer-Facing

- API Docs: `/interview/start-session`, `/interview/end-session`
- Component Storybook: AIAvatarCanvas, EndInterviewModal, ScoreCard
- Architecture Decision Records (ADRs):
  - ADR-012: Three.js for avatar rendering vs static video
  - ADR-013: Session token strategy (JWT vs opaque tokens)

## Future Enhancements (Out of Scope)

- **S16.1**: Dynamic avatar selection (gender, appearance)
- **S16.2**: Advanced lip-sync using audio frequency analysis
- **S21**: Interview resumption after disconnect
- **S22**: Multi-language avatar support
- **S23**: Recruiter dashboard with session replays

## Stakeholder Sign-Off

- [ ] Product Lead: ****\*\*****\_\_\_****\*\*****
- [ ] Engineering Lead: ****\*\*****\_\_\_****\*\*****
- [ ] Design Lead: ****\*\*****\_\_\_****\*\*****
- [ ] QA Lead: ****\*\*****\_\_\_****\*\*****

---

## Story Links

- [EP5-S14: Interview Start State Bugfix](./ep5-s14-interview-start-state-bugfix.md)
- [EP5-S15: Split-Screen Layout Refactor](./ep5-s15-split-screen-layout-refactor.md)
- [EP5-S16: ReadyPlayerMe Avatar Integration](./ep5-s16-readyplayerme-avatar-integration.md)
- [EP5-S17: Conditional Device Info & Feed Removal](./ep5-s17-conditional-device-info-feed-removal.md)
- [EP5-S18: Start Session API Integration](./ep5-s18-start-session-api-integration.md)
- [EP5-S19: End Interview Button & Early Termination](./ep5-s19-end-interview-button-early-termination.md)
- [EP5-S20: Dedicated Score Screen Navigation](./ep5-s20-dedicated-score-screen-navigation.md)

---

**Last Updated**: 2025-11-05  
**Epic Owner**: Architect Agent  
**Sprint**: 3-4 (Weeks 1-4)
