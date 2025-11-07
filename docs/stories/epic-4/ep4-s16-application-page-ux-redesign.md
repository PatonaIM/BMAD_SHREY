# EP4-S16: Application Page UX Design Refresh

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S16  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** UX designer and product team,  
**I want** to completely redesign the application page with modern timeline layout, sticky headers, and role-specific views,  
**So that** both candidates and recruiters have intuitive, efficient, and visually appealing application management experiences.

---

## Acceptance Criteria

### AC1: UX Expert Consultation & Design Brief

- [ ] Engage UX expert to create comprehensive design specifications
- [ ] UX deliverables include:
  - **Wireframes:** Low-fidelity layouts for candidate and recruiter views
  - **Mockups:** High-fidelity designs with brand colors (#A16AE8, #8096FD)
  - **Prototypes:** Interactive Figma/Adobe XD prototypes for user testing
  - **Design System:** Components, spacing, typography, color usage guidelines
  - **Responsive Breakpoints:** Desktop (1920px, 1440px, 1024px), Tablet (768px), Mobile (375px, 320px)
  - **Accessibility Annotations:** WCAG 2.1 AA compliance notes per component
- [ ] Design review sessions with product and engineering teams (2-3 iterations)
- [ ] User testing with 5-10 candidates and 5-10 recruiters for feedback

### AC2: Timeline Layout Architecture

- [ ] **Full-Page Timeline Design:**
  - Vertical timeline as primary content area (80% of viewport width on desktop)
  - Timeline events displayed as cards with left-aligned icons and connector lines
  - Smooth scrolling with momentum and snap-to-event behavior
  - Auto-scroll to most recent unread event on page load
  - Infinite scroll or pagination for applications with 50+ events
- [ ] **Visual Hierarchy:**
  - Clear distinction between candidate actions (blue accent) and recruiter actions (purple accent)
  - Event importance indicated by card size and emphasis (bold for critical events)
  - Timestamps in relative format ("2 hours ago") with hover tooltip showing exact date/time
  - Icons for each event type (🚀 submission, 🎤 interview, 📝 assignment, ✉️ notification)

- [ ] **Responsive Behavior:**
  - Desktop: Full timeline with sidebar profile (recruiter view)
  - Tablet: Timeline with collapsible profile section
  - Mobile: Timeline only, profile accessible via header button
  - Horizontal scroll for wide content (interview recordings, assignment previews) on mobile

### AC3: Sticky Header Design

- [ ] **Candidate View Header:**
  - Top section remains fixed while scrolling timeline
  - Contains: Candidate name (their own), job title, company logo, application status badge, match score
  - Quick actions: "View My Profile", "Withdraw Application", "Download Timeline PDF"
  - Background color reflects status (green: progressing, yellow: action needed, gray: waiting)
  - Shadow/blur effect appears on scroll for depth perception
  - Mobile: Condensed header (candidate name + status only, actions in hamburger menu)
- [ ] **Recruiter View Header:**
  - Contains: Candidate name, profile photo (thumbnail), job title, match score, status dropdown
  - Quick actions: "View Full Profile", "Disqualify", "Share Profile", "Schedule Interview", "More Actions (...)"
  - Background adapts to status urgency (red: action needed, green: on track, gray: waiting)
  - Mobile: Two-row layout (name/photo on row 1, actions on row 2)

- [ ] **Header Behavior:**
  - Header height: 80-100px on desktop, 60px on mobile
  - Smooth transition when scrolling (fade-in shadow, reduce height by 20% after 100px scroll)
  - Header doesn't overlap timeline content (timeline starts below header)
  - z-index ensures header stays above timeline but below modals

### AC4: Color Psychology & Status Indicators

- [ ] **Status Badge Colors:**
  - **Submitted:** Blue (#2196F3) - Neutral, informational
  - **Under Review:** Purple (#A16AE8) - Active, in-progress
  - **AI Interview Pending:** Orange (#FF9800) - Action needed (candidate)
  - **Interview Scheduled:** Green (#4CAF50) - Positive progress
  - **Assignment Pending:** Orange (#FF9800) - Action needed (candidate)
  - **Awaiting Feedback:** Yellow (#FFC107) - Waiting on recruiter
  - **Rejected:** Red (#F44336) - Negative outcome
  - **Offer Extended:** Dark Green (#2E7D32) - Success
- [ ] **Timeline Event Colors:**
  - Candidate actions: Blue accent border (#2196F3)
  - Recruiter actions: Purple accent border (#A16AE8)
  - System actions: Gray accent border (#757575)
  - Completed stages: Green checkmark icon
  - Failed/rejected stages: Red X icon

### AC5: Interactive Elements & Microinteractions

- [ ] **Hover States:**
  - Timeline event cards: Subtle elevation increase, background lightens
  - Buttons: Background darkens, slight scale increase (1.05x)
  - Quick action icons: Tooltip appears with action name
- [ ] **Click Feedback:**
  - Ripple effect on buttons (Material-UI standard)
  - Card expansion animation (smooth height transition, 300ms)
  - Status change confirmation toast notification
- [ ] **Loading States:**
  - Skeleton screens for timeline events while loading
  - Shimmer effect on skeleton cards
  - Spinner for inline actions (schedule interview, submit feedback)
  - Progress bar at top of page for bulk operations
- [ ] **Success/Error Feedback:**
  - Green checkmark animation for completed actions
  - Red error icon with shake animation for failures
  - Toast notifications with undo capability (where applicable)
  - Confetti animation for offer acceptance

### AC6: Candidate-Specific Design Elements

- [ ] **Progress Indicators:**
  - Linear progress bar showing % complete through hiring process
  - "What's Next?" card always visible at top of timeline
  - Upcoming deadline countdown timers (interview in 3 hours, assignment due in 2 days)
- [ ] **Call-to-Action Emphasis:**
  - Primary CTA buttons (Take AI Interview, Fill Expectations, Upload Assignment) use prominent purple gradient
  - Button size: Large (48px height) for critical actions, Medium (40px) for secondary
  - Icon + text labels for clarity
- [ ] **Encouragement & Motivation:**
  - Positive reinforcement messages ("Great job completing the AI interview!")
  - Celebration animations for milestone completions
  - Progress milestones: "You're 60% through the process!"

### AC7: Recruiter-Specific Design Elements

- [ ] **Embedded Profile Sidebar:**
  - Right sidebar (300-400px width) with candidate profile summary
  - Collapsible sections: Basic Info, Skills, Experience, Education, AI Interview, Expectations
  - "View Full Profile" button opens profile in new tab or modal
  - Sidebar becomes overlay on tablet, hidden on mobile (accessible via header button)
- [ ] **Action Density:**
  - More actions available (10+ quick actions vs. 3 for candidates)
  - Icon buttons with tooltips to save space
  - "More Actions" overflow menu for less common actions
  - Context menu (right-click) on timeline events for quick actions
- [ ] **Data Visualization:**
  - Match score displayed as circular progress indicator (0-100)
  - Skill match shown as horizontal bar chart (matched vs. missing)
  - Interview ratings shown as star ratings (1-5 stars)
  - Assignment scores shown as colored badges (>80: green, 60-79: yellow, <60: red)

### AC8: Accessibility & Inclusive Design

- [ ] **WCAG 2.1 AA Compliance:**
  - Color contrast ratio: 4.5:1 for text, 3:1 for UI components
  - Font size: Minimum 16px for body text, 14px for secondary text
  - Interactive elements: Minimum 44x44px touch target size
  - Focus indicators: 2px solid outline with 2px offset (brand color)
- [ ] **Keyboard Navigation:**
  - Tab order follows logical reading flow (header → timeline → actions)
  - Escape key closes modals and dropdowns
  - Enter/Space activates buttons and links
  - Arrow keys navigate through timeline events (optional enhancement)
- [ ] **Screen Reader Support:**
  - ARIA labels for all icons and interactive elements
  - Live regions announce timeline updates ("New interview scheduled")
  - Heading hierarchy (h1 for page title, h2 for sections, h3 for events)
  - Skip navigation link to jump to main timeline content
- [ ] **Cognitive Accessibility:**
  - Clear, concise language (avoid jargon)
  - Icons paired with text labels (not icon-only buttons)
  - Consistent layout and patterns across views
  - Ample white space to reduce cognitive load

### AC9: Performance Optimization

- [ ] **Page Load Performance:**
  - First Contentful Paint (FCP): <1.5 seconds
  - Largest Contentful Paint (LCP): <2.5 seconds
  - Time to Interactive (TTI): <3.5 seconds
  - Cumulative Layout Shift (CLS): <0.1
- [ ] **Rendering Optimization:**
  - Virtual scrolling for timelines with 100+ events
  - Lazy loading for embedded videos and images
  - Skeleton screens prevent layout shift during load
  - Code splitting: Separate bundles for candidate and recruiter views
- [ ] **Asset Optimization:**
  - SVG icons (vector, scalable, small file size)
  - WebP images with PNG/JPG fallback
  - Font subsetting (only include used character sets)
  - CSS-in-JS with critical CSS extraction

### AC10: Design Handoff & Implementation

- [ ] **Developer Handoff Package:**
  - Figma/Sketch file with dev mode enabled (inspect spacing, colors, fonts)
  - Design tokens exported as JSON (colors, spacing, typography)
  - Component specifications document (props, states, variants)
  - Animation specifications (timing functions, durations, keyframes)
  - Responsive breakpoints and behavior documentation
- [ ] **Implementation Validation:**
  - Design QA review on dev/staging environment (pixel-perfect comparison)
  - Cross-browser testing: Chrome, Firefox, Safari, Edge (latest 2 versions)
  - Cross-device testing: Desktop, iPad, iPhone, Android phone
  - Accessibility audit using axe DevTools or Lighthouse
  - Performance testing using Lighthouse and WebPageTest

---

## Definition of Done (DoD)

### UX Design Phase

- [ ] **Research & Discovery:**
  - Competitive analysis: Review application tracking UIs from Greenhouse, Lever, Workable
  - User interviews: 5 candidates + 5 recruiters (pain points, preferences)
  - Analytics review: Current application page usage patterns, drop-off points
  - Accessibility audit: Identify current compliance gaps
- [ ] **Design Iteration:**
  - Wireframes created and approved by product team
  - High-fidelity mockups created for candidate and recruiter views
  - Interactive prototypes built for user testing
  - User testing sessions conducted (2 rounds minimum)
  - Design revisions based on feedback
  - Final design sign-off from product and engineering leads

### Frontend Implementation

- [ ] **Component Library:**
  - `ApplicationTimelinePage.tsx` - Main page wrapper (candidate and recruiter variants)
  - `TimelineStickyHeader.tsx` - Fixed header with quick actions
  - `TimelineEventsList.tsx` - Scrollable timeline container
  - `TimelineEventCard.tsx` - Individual event card (polymorphic)
  - `ProfileSidebar.tsx` - Recruiter-only embedded profile (collapsible)
  - `StatusBadge.tsx` - Status indicator with color coding
  - `ProgressIndicator.tsx` - Visual progress through hiring process
  - `QuickActionsMenu.tsx` - Header action buttons
  - `EventIcon.tsx` - Icon component for different event types
- [ ] **Styling Implementation:**
  - Material-UI theme customization with brand colors
  - CSS modules or styled-components for component-specific styles
  - Responsive breakpoints using Material-UI's `useMediaQuery` hook
  - Animation library integration (Framer Motion or React Spring)
  - Icon library integration (Material Icons or custom SVG sprites)
- [ ] **State Management:**
  - React Query for timeline data fetching and caching
  - Local state for UI interactions (sidebar collapse, modal visibility)
  - Context for shared data (application metadata, current stage)
  - WebSocket integration for real-time updates

### Testing & Validation

- [ ] **Visual Regression Testing:**
  - Percy or Chromatic snapshots for all views and breakpoints
  - Baseline screenshots captured and approved
  - Automated visual diff detection on PR builds
- [ ] **Accessibility Testing:**
  - Automated: axe DevTools, Lighthouse accessibility score >95
  - Manual: Keyboard navigation testing (all actions accessible)
  - Screen reader testing: VoiceOver (Mac), NVDA (Windows), TalkBack (Android)
  - Color contrast verification: All text meets 4.5:1 ratio
- [ ] **Cross-Browser Testing:**
  - Chrome 90+ (Windows, Mac, Android)
  - Firefox 88+ (Windows, Mac)
  - Safari 14+ (Mac, iOS)
  - Edge 90+ (Windows)
- [ ] **Performance Testing:**
  - Lighthouse performance score >90 on desktop, >80 on mobile
  - Page load time <3 seconds on 3G network
  - Render time <500ms for timeline with 50 events

### Documentation

- [ ] **Design System Documentation:**
  - Storybook stories for all components with variants
  - Usage guidelines for designers and developers
  - Accessibility guidelines per component
  - Do's and don'ts with examples
- [ ] **User Documentation:**
  - Help center article: "Understanding Your Application Timeline"
  - Video tutorial: "How to Track Your Application Progress"
  - FAQ: Common questions about application page features

---

## Dependencies

- **Requires:**
  - UX expert consultation (external or internal team)
  - EP4-S12 & EP4-S13 functional requirements (timeline content)
  - Design tool access (Figma, Sketch, Adobe XD)
- **Blocks:** Final implementation of EP4-S12 and EP4-S13 (design must be approved first)
- **Related:** All Epic 4 stories (visual design applies to all features)

---

## UX Expert Consultation Topics

### Key Questions for UX Expert:

1. **Timeline Layout:**
   - Vertical vs. horizontal timeline? Linear vs. branching?
   - Event card size: Fixed height vs. content-based? Expansion behavior?
   - Connector lines: Solid, dashed, dotted? Color-coded by actor?
2. **Sticky Header:**
   - Full-width vs. centered container? Shadow vs. border vs. blur backdrop?
   - Quick actions: Icon-only, text-only, or icon+text? Dropdown vs. visible?
   - Mobile: Single-row vs. multi-row? Hamburger menu vs. visible buttons?
3. **Profile Sidebar (Recruiter):**
   - Fixed right sidebar vs. overlay vs. modal? Collapsible sections vs. tabs?
   - When to show full profile: New tab, modal, or inline expansion?
   - Mobile behavior: Bottom sheet, full-screen modal, or separate page?
4. **Status Indicators:**
   - Badge style: Pill, rectangle, circle? Filled vs. outlined?
   - Icon usage: Icon-only, icon+text, or text-only?
   - Animation: Pulse for attention, static, or subtle glow?
5. **Responsive Strategy:**
   - Mobile-first vs. desktop-first design approach?
   - Content priority on mobile: What to hide, collapse, or remove?
   - Touch gestures: Swipe to reveal actions, pinch to zoom timeline?
6. **Accessibility:**
   - High contrast mode design (dark backgrounds, inverted colors)?
   - Reduced motion preferences (disable animations)?
   - Font scaling: Support 200% zoom without breaking layout?

---

## Success Metrics

- **Usability:** System Usability Scale (SUS) score >80 (post-launch survey)
- **Efficiency:** 40% reduction in time to find specific application information
- **Engagement:** 50% increase in average time spent on application page (positive engagement)
- **Accessibility:** Zero critical accessibility issues in automated scans
- **Performance:** Lighthouse performance score >90 on desktop, >80 on mobile
- **Satisfaction:** 85%+ users rate new design as "better" or "much better" than old version

---

## Future Enhancements

- **Dark Mode:** Full dark theme support with toggle in header
- **Customization:** User preferences for timeline density (compact vs. comfortable)
- **AI Assistant:** Chatbot overlay for questions about application status
- **Collaboration:** Hiring team comments directly on timeline events (recruiter view)
- **Gamification:** Achievement badges for candidates (e.g., "Fast Responder", "Top Scorer")
- **Internationalization:** Multi-language support with RTL layout for Arabic, Hebrew

---

## Design Inspiration & References

- **Timeline Examples:**
  - Greenhouse candidate portal (clean, professional)
  - Lever hiring stages (visual progression)
  - Workable applicant tracking (status-driven)
- **Modern Design Patterns:**
  - Notion (clean, minimal, responsive)
  - Linear (smooth animations, keyboard shortcuts)
  - Figma (sidebar + main content layout)
  - Slack (message timeline, threaded conversations)

---

## Notes

- **Design should feel modern but not trendy** (avoid overly stylized elements that age quickly)
- **Mobile-first is critical** (60% of candidates check status on mobile devices)
- **Accessibility is non-negotiable** (legal requirement and ethical imperative)
- **Performance matters** (slow pages lead to candidate frustration and abandonment)
- **Iterate based on data** (A/B test controversial design decisions if needed)
