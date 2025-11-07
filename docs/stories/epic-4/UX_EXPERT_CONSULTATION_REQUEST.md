# UX Expert Consultation Request - Epic 4

**Date:** November 7, 2025  
**Epic:** Epic 4 - Advanced Application Management & Recruiter Tools  
**Requestor:** John (Product Manager)  
**Status:** 🟡 Awaiting UX Expert Review

---

## 🎯 Consultation Objectives

1. **Design Requirements:** Gather detailed UX specifications for all 8 Epic 4 stories
2. **Risk Identification:** Identify potential UX/UI risks, usability issues, and design challenges
3. **Implementation Order:** Recommend optimal story sequencing based on design dependencies
4. **User Flow Validation:** Validate end-to-end recruiter and candidate journeys
5. **Design Consistency:** Ensure cohesive experience across all Epic 4 features

---

## 📋 Stories Requiring UX Review

### **EP4-S9: Recruiter Dashboard with Job Management**

📄 [Full Story](./ep4-s9-recruiter-job-dashboard.md)

**User Story:**
As a recruiter, I want to view and manage jobs across Active, All, and Closed categories with subscription capabilities, so that I can efficiently track jobs I'm responsible for.

**Key UX Questions:**

1. **Dashboard Layout:**
   - Should tabs be horizontal (top) or vertical (sidebar)?
   - How to indicate job subscription status (badge, icon, color)?
   - What information density is optimal for job cards (compact vs. detailed)?

2. **Job Subscription:**
   - Where should "Subscribe" button be placed on job cards?
   - How to show which recruiters are already subscribed (tooltip, modal, inline)?
   - Should we use toggle switch or explicit Subscribe/Unsubscribe buttons?

3. **Empty States:**
   - What messaging for "No Active Jobs" (first-time users)?
   - What messaging for "No Closed Jobs" (no historical data)?
   - Should we suggest actions (e.g., "Browse All Jobs to subscribe")?

4. **Multi-Recruiter Indicators:**
   - How to show "3 recruiters assigned" without cluttering UI?
   - Should we show recruiter avatars or just count?
   - What happens when 10+ recruiters subscribe (truncation strategy)?

5. **Mobile Experience:**
   - How do tabs work on mobile (scrollable, dropdown, bottom nav)?
   - Should job cards be full-width or maintain desktop card layout?
   - How to make search and filters accessible on small screens?

**Potential Risks:**

- ⚠️ Information overload with too many jobs displayed
- ⚠️ Confusion between "Active" (subscribed) vs. "All Jobs" (everything)
- ⚠️ Mobile navigation may be challenging with 3 tabs + search + filters

---

### **EP4-S10: Google Chat Notification Integration**

📄 [Full Story](./ep4-s10-google-chat-notifications.md)

**User Story:**
As a recruiter, I want to receive real-time notifications via Google Chat for application events, so that I can respond quickly without constantly checking the dashboard.

**Key UX Questions:**

1. **Setup Flow:**
   - Should "Get Notifications" button be prominent or subtle?
   - Multi-step wizard vs. single-page setup modal?
   - How to guide recruiters to obtain Google Chat webhook URL (instructions, video, screenshots)?

2. **Notification Preferences:**
   - How many settings are too many (balance control vs. simplicity)?
   - Should preferences be inline or separate settings page?
   - How to make quiet hours easy to configure (time picker, predefined options)?

3. **Visual Feedback:**
   - How to show notification setup status (badge, icon, color indicator)?
   - What messaging for "Notifications enabled successfully"?
   - How to handle webhook URL errors (invalid, expired)?

4. **Testing & Validation:**
   - Should "Test Notification" be prominent or secondary action?
   - How to display test results (modal, toast, inline message)?
   - What if test fails (troubleshooting guidance)?

5. **Notification History:**
   - Is notification log necessary in MVP (or defer to Phase 2)?
   - If included, how to present 30 days of history (table, timeline, cards)?

**Potential Risks:**

- ⚠️ Complex webhook setup may confuse non-technical recruiters
- ⚠️ Too many notification preferences may overwhelm users
- ⚠️ Notification fatigue if hourly digests are too frequent

---

### **EP4-S11: Suggested Candidates Tab**

📄 [Full Story](./ep4-s11-suggested-candidates-tab.md)

**User Story:**
As a recruiter, I want to see suggested candidates who match job requirements but haven't applied yet, so that I can proactively source talent.

**Key UX Questions:**

1. **Tab Placement:**
   - Should "Suggested Candidates" be a tab on job detail page (alongside "Applications")?
   - Or a separate section on recruiter dashboard?
   - How to make it discoverable without being intrusive?

2. **Section Layout:**
   - Should "Proactive Matches" and "High Scorers" be side-by-side or stacked?
   - How to differentiate the two sections visually (color, headers, icons)?
   - What if one section is empty (show empty state or hide entirely)?

3. **Candidate Cards:**
   - What information to show: Name, photo, score, skills, location, years of experience?
   - How to present match score (circular progress, bar, numeric badge)?
   - How to show "why suggested" explanation (tooltip, expandable, always visible)?

4. **Invite to Apply:**
   - Should "Invite" button be on every card or bulk selection?
   - How to compose invitation message (modal, inline form, pre-filled template)?
   - What happens after invitation sent (confirmation, undo, tracking)?

5. **Filtering & Sorting:**
   - How many filters are necessary (location, experience, score, availability)?
   - Should filters be always visible or collapsible panel?
   - How to show active filters (chips, badges, reset button)?

**Potential Risks:**

- ⚠️ Two sections may confuse recruiters ("Which candidates should I focus on?")
- ⚠️ Match score explanation critical (without it, recruiters won't trust suggestions)
- ⚠️ Invitation limit (20/week) needs clear messaging to prevent frustration

---

### **EP4-S12: Application Timeline View - Candidate Perspective**

📄 [Full Story](./ep4-s12-application-timeline-candidate.md)

**User Story:**
As a candidate, I want a visual timeline showing my application progress from submission through all hiring stages, so that I understand where I stand and what actions I need to take next.

**Key UX Questions:**

1. **Timeline Orientation:**
   - Vertical timeline (traditional, scrollable)?
   - Horizontal timeline (progress bar style)?
   - Hybrid (horizontal overview + vertical details)?

2. **Sticky Header Design:**
   - How much information in header (name, job, status, score, actions)?
   - Should header shrink on scroll or remain full height?
   - Where to place quick actions (buttons, dropdown, hamburger menu)?

3. **Event Card Design:**
   - How much detail per event (title + timestamp only, or full descriptions)?
   - Should events be expandable (collapsed by default, click to expand)?
   - How to differentiate event types (icons, colors, card styles)?

4. **Call-to-Action Emphasis:**
   - How to highlight required actions (AI interview, expectations, upload assignment)?
   - Should pending actions float to top or remain chronologically ordered?
   - What visual treatment for deadlines (countdown timer, urgent banner)?

5. **Progress Indicators:**
   - Should there be an overall progress bar ("60% through process")?
   - How to show future stages (grayed out, locked, or completely hidden)?
   - What messaging for "Waiting for recruiter" states?

6. **Mobile Optimization:**
   - Should timeline remain vertical on mobile or switch to horizontal carousel?
   - How to make sticky header work without covering content?
   - Should we prioritize recent events or show full history?

**Potential Risks:**

- ⚠️ Timeline may become very long (50+ events) → Need pagination or virtualization
- ⚠️ Candidates may miss required actions if buried in timeline → Need prominent CTAs
- ⚠️ Status ambiguity ("Under Review" could mean recruiter hasn't looked yet or is actively reviewing)

---

### **EP4-S13: Application Timeline View - Recruiter Perspective**

📄 [Full Story](./ep4-s13-application-timeline-recruiter.md)

**User Story:**
As a recruiter, I want a comprehensive timeline view with embedded profile access and action capabilities, so that I can efficiently review candidates and take hiring actions without navigating between pages.

**Key UX Questions:**

1. **Layout Architecture:**
   - Timeline + sidebar (profile on right, timeline on left)?
   - Timeline + overlay (profile appears on click)?
   - Timeline + tabs (profile in separate tab)?
   - How wide should sidebar be (300px, 400px, 500px)?

2. **Sticky Header Actions:**
   - How many quick actions are too many (current: 7 actions)?
   - Should we group actions (primary, secondary, overflow menu)?
   - Icon-only, text-only, or icon+text buttons?
   - How to handle mobile (hamburger menu, bottom sheet, full-width buttons)?

3. **Profile Sidebar:**
   - Should profile sections be collapsible accordions or scrollable?
   - How to indicate profile is view-only (lock icon, disabled styles, message)?
   - Should sidebar be resizable (drag to adjust width)?
   - What happens on tablet (sidebar becomes modal or bottom drawer)?

4. **Interview Scheduling Modal:**
   - Single-step form or multi-step wizard (date → time → interviewers → confirm)?
   - Should calendar integration be inline or link to external calendar?
   - How to show recruiter's availability (calendar picker with blocked times)?
   - What if GMeet link generation fails (fallback options)?

5. **Assignment Modal:**
   - How much space for description (150 char, 500 char, WYSIWYG editor)?
   - Should file upload be drag-drop or click-to-browse?
   - How to preview uploaded files (thumbnails, file names, icons)?
   - Where to show external link input (HackerRank, GitHub template)?

6. **Feedback Forms:**
   - Should feedback be inline or modal?
   - How to make 1-5 star rating intuitive (stars, slider, buttons)?
   - How much guidance for written feedback (character minimum, prompts)?
   - Should we auto-save feedback drafts (prevent data loss)?

7. **Private Notes:**
   - Where should private notes live (sidebar, inline in timeline, separate tab)?
   - How to differentiate private (recruiter-only) vs. public (candidate-visible) content?
   - Should notes support rich text (bold, bullets, links)?

**Potential Risks:**

- ⚠️ Information overload: Timeline + profile + modals = cognitive burden
- ⚠️ Modal fatigue: Too many modals for scheduling, assignments, feedback
- ⚠️ Mobile experience may be severely compromised (sidebar doesn't work on small screens)
- ⚠️ Accidentally exposing private notes to candidates (security/privacy risk)

---

### **EP4-S14: Share Profile with Section Selection**

📄 [Full Story](./ep4-s14-share-profile-section-selection.md)

**User Story:**
As a recruiter, I want to selectively share specific sections of a candidate's profile with stakeholders, so that I can provide relevant information without overwhelming them.

**Key UX Questions:**

1. **Section Selection UI:**
   - Checkbox list (simple, familiar)?
   - Drag-and-drop builder (visual, flexible)?
   - Toggle switches (modern, space-efficient)?
   - How to show section descriptions (tooltips, inline text)?

2. **Preview Functionality:**
   - Should preview be real-time (updates as you select sections)?
   - Side-by-side (selection on left, preview on right)?
   - Modal-based (click "Preview" to open separate view)?
   - Mobile: How to show preview on small screens?

3. **Recipient Input:**
   - Single email input or multi-recipient (chips, tags)?
   - Should we validate emails (real-time, on submit)?
   - How to handle invalid emails (error message, highlight, remove)?
   - Should we save frequently used recipients (autocomplete)?

4. **Expiration Settings:**
   - Dropdown with presets (1 day, 7 days, 30 days) or custom date picker?
   - How to explain "Never expires" option (security implications)?
   - Should expiration be prominent or secondary setting?

5. **Link Generation:**
   - Should link appear immediately or after "Generate" button click?
   - How to display link (read-only input, copy button, QR code)?
   - What feedback for successful copy (toast, checkmark animation)?
   - Should we show link preview (what recipient will see)?

6. **Shared Profile View (Recipient):**
   - Should it look like internal profile (consistent) or custom layout (simplified)?
   - How to watermark "Shared by [Recruiter]" (header banner, footer, subtle badge)?
   - Should navigation be disabled (prevent recipients from exploring other pages)?
   - What if link is expired (helpful error message vs. generic 404)?

**Potential Risks:**

- ⚠️ Confusion about what "sections" means (need clear labels and descriptions)
- ⚠️ Recipients may not understand limited view (why can't I see everything?)
- ⚠️ Accidentally sharing sensitive information (AI interview scores, internal notes)
- ⚠️ Mobile preview may be impractical (too much to show on small screen)

---

### **EP4-S15: Multi-Stage Interview & Assignment Sequential Management**

📄 [Full Story](./ep4-s15-multi-stage-sequential-workflow.md)

**User Story:**
As a recruiter, I want to schedule multiple sequential interview rounds and assignments in any order with completion tracking, so that I can implement complex hiring workflows.

**Key UX Questions:**

1. **Workflow Visualization:**
   - How to show all stages at once (vertical list, horizontal flow diagram, numbered cards)?
   - How to indicate stage status (colors, icons, progress bars)?
   - Should completed stages be collapsible or always visible?
   - How to show dependencies ("Complete Stage 2 before adding Stage 3")?

2. **Add Stage Interaction:**
   - Should "Add Stage" be floating button, inline button, or dropdown?
   - How to choose stage type (modal, inline radio buttons, split button)?
   - Where does new stage appear (at end of list, inline insertion)?

3. **Stage Blocking UX:**
   - What happens when recruiter tries to add blocked stage (error modal, disabled button, tooltip)?
   - How to make it obvious next stage is locked (lock icon, grayed out, message)?
   - Should we suggest completing current stage ("Finish Stage 2 first")?

4. **Interview vs. Assignment Forms:**
   - Should they have similar layouts (consistency) or optimized separately?
   - How much space for assignment description (500 char, 1000 char, rich text)?
   - Should deadline picker suggest dates (7 days, 14 days) or free-form?

5. **Feedback Collection:**
   - Should feedback form be inline (expand stage card) or modal?
   - How to handle required fields (prevent submission or allow draft save)?
   - Should feedback be visible to other team members immediately or after submission?

6. **Progress Indicator:**
   - Where should "Stage 2 of 4" indicator appear (header, sidebar, inline)?
   - Should there be a visual progress bar (linear, circular, stepped)?
   - How to celebrate completion ("All stages complete!" message)?

7. **Candidate View of Stages:**
   - Should candidates see all future stages (transparency) or only current stage (reduce anxiety)?
   - How to explain locked future stages ("Next step will be revealed after...")?

**Potential Risks:**

- ⚠️ Workflow complexity may overwhelm recruiters (especially with 5+ stages)
- ⚠️ Stage blocking may frustrate recruiters ("Why can't I schedule interview now?")
- ⚠️ Candidates may drop out if workflow feels too long (need encouraging messaging)
- ⚠️ Mobile: Complex workflow UI may not translate well to small screens

---

### **EP4-S16: Application Page UX Design Refresh**

📄 [Full Story](./ep4-s16-application-page-ux-redesign.md)

**User Story:**
As a UX designer and product team, I want to completely redesign the application page with modern timeline layout, sticky headers, and role-specific views, so that both candidates and recruiters have intuitive experiences.

**Key UX Questions:**

1. **Design System:**
   - Should we create new components or adapt existing Material-UI components?
   - What animation philosophy (subtle, prominent, minimal)?
   - How to balance brand colors (#A16AE8 purple, #8096FD blue) with neutral UI?

2. **Sticky Header Strategy:**
   - Should header be full-width or centered container?
   - How much height (80px, 100px, 120px)?
   - What scroll behavior (shrink, hide, stay fixed)?
   - Mobile: Should header collapse into hamburger menu?

3. **Timeline Visual Language:**
   - Should connector lines be solid, dashed, or dotted?
   - How thick should lines be (1px, 2px, 4px)?
   - Should events have shadows or flat design?
   - How to handle very long timelines (virtual scrolling, pagination, "load more")?

4. **Color Psychology:**
   - Blue for candidate actions - Is this intuitive?
   - Purple for recruiter actions - Does this convey authority?
   - What colors for system actions (gray, teal, orange)?
   - How to handle color-blind accessibility (icons, patterns, labels)?

5. **Responsive Breakpoints:**
   - Should we optimize for iPad specifically (in between mobile and desktop)?
   - How aggressively should we simplify for mobile (hide elements, collapse sections)?
   - Should landscape mobile behave like tablet or mobile portrait?

6. **Loading States:**
   - Skeleton screens vs. spinners vs. progress bars?
   - How many skeleton cards to show (3, 5, 10)?
   - Should skeletons animate (shimmer, pulse, fade)?

7. **Error Handling:**
   - Where should errors appear (toast, inline banner, modal)?
   - How long should error messages persist (3s, 5s, manual dismiss)?
   - Should we use icons for error types (warning triangle, error X, info circle)?

**Potential Risks:**

- ⚠️ Design refresh may introduce inconsistency with rest of platform
- ⚠️ Timeline layout may not feel familiar to users (learning curve)
- ⚠️ Sticky headers may cover content on scroll (Z-index issues)
- ⚠️ Performance: Complex animations may cause jank on low-end devices

---

## 🚨 Cross-Story UX Concerns

### **1. Navigation & Information Architecture**

- How do users navigate between Dashboard (EP4-S9), Job Detail (EP4-S11), and Application Timeline (EP4-S12/S13)?
- Should breadcrumbs show full path or abbreviated?
- How to return to previous context (browser back, explicit "Back" button)?

### **2. Consistency Across Stories**

- Should all modals have consistent layout (header, body, footer with Cancel/Submit)?
- Should all forms use same validation patterns (inline errors, submit-time errors)?
- Should all tables/lists have same pagination/filtering patterns?

### **3. Mobile-First vs. Desktop-First**

- Given recruiter workflows are complex, should we optimize for desktop first?
- Or should we ensure mobile parity from day one (mobile-first approach)?
- What features are acceptable to deprioritize on mobile?

### **4. Accessibility Consistency**

- Should all interactive elements have same focus indicator style?
- Should all modals have same keyboard shortcuts (ESC to close, Tab to navigate)?
- Should all forms have same screen reader announcements?

### **5. Data Loading & Performance**

- Should all lists use infinite scroll or pagination?
- Should we show loading skeletons everywhere or just spinners?
- How to handle slow network conditions (timeout messaging)?

---

## 🎯 Key Deliverables Requested

### **1. Design Specifications** _(For Each Story)_

- [ ] Low-fidelity wireframes (Figma, Sketch, or Balsamiq)
- [ ] High-fidelity mockups (Desktop: 1440px, Mobile: 375px)
- [ ] Interactive prototypes (clickable flows for user testing)
- [ ] Component specifications (states, variants, interactions)

### **2. User Flows** _(End-to-End Journeys)_

- [ ] Recruiter onboarding: Dashboard → Subscribe to job → Review applications
- [ ] Recruiter hiring: Review timeline → Schedule interview → Give assignment → Provide feedback
- [ ] Candidate application: Submit → AI interview → Expectations → Timeline monitoring
- [ ] Profile sharing: Select sections → Generate link → Stakeholder views profile

### **3. Design System Documentation**

- [ ] Color palette (primary, secondary, status colors)
- [ ] Typography scale (headings, body, captions)
- [ ] Spacing system (margins, padding, grid)
- [ ] Component library (buttons, cards, modals, forms)
- [ ] Icon set (consistent style, size, usage)

### **4. Accessibility Guidelines**

- [ ] Keyboard navigation map (Tab order, shortcuts)
- [ ] Screen reader annotations (ARIA labels, live regions)
- [ ] Color contrast verification (4.5:1 for text, 3:1 for UI)
- [ ] Focus indicator specifications (color, thickness, offset)

### **5. Responsive Design Strategy**

- [ ] Breakpoint definitions (mobile: 375px, tablet: 768px, desktop: 1440px)
- [ ] Layout adaptations per breakpoint (stacked, side-by-side, hidden)
- [ ] Touch target sizes (44x44px minimum)
- [ ] Mobile gesture patterns (swipe, pinch, long-press)

### **6. Risk Mitigation Recommendations**

- [ ] Identified usability risks with severity ratings (High, Medium, Low)
- [ ] Proposed solutions or alternatives for each risk
- [ ] User testing plan for validating high-risk designs

### **7. Implementation Order Recommendation**

- [ ] Story sequencing based on design dependencies
- [ ] Rationale for recommended order
- [ ] Estimated design effort per story (hours or days)
- [ ] Parallel work opportunities (stories that can be designed simultaneously)

---

## 📊 Recommended Implementation Order

**Please provide your recommendation for story implementation order based on:**

1. **Design Complexity:** Which stories require more design effort?
2. **Dependencies:** Which stories must be completed before others?
3. **User Value:** Which stories deliver highest value earliest?
4. **Risk Mitigation:** Which stories have highest UX risk and should be validated first?
5. **Development Efficiency:** Which order minimizes rework and design iteration?

**Example Format:**

```
Phase 1 (Foundation):
- EP4-S16 (UX Design Refresh) - Must complete first
- EP4-S9 (Dashboard) - Core entry point

Phase 2 (Timeline Views):
- EP4-S12 (Candidate Timeline) - Simpler than recruiter view
- EP4-S13 (Recruiter Timeline) - Builds on candidate patterns

Phase 3 (Advanced Features):
- EP4-S15 (Multi-Stage Workflows) - Depends on timeline design
- EP4-S10 (Google Chat) - Can be done in parallel
- EP4-S11 (Suggested Candidates) - Extends dashboard

Phase 4 (Polish):
- EP4-S14 (Profile Sharing) - Lower priority, builds on timeline
```

---

## 🧪 User Testing Plan

**Recommended Testing Approach:**

1. **Wireframe Testing (Early Stage):**
   - 5 recruiters + 5 candidates
   - Paper prototypes or Figma clickable prototypes
   - Task-based testing (subscribe to job, schedule interview, check application status)

2. **High-Fidelity Testing (Pre-Development):**
   - 10 recruiters + 10 candidates
   - Interactive Figma prototypes
   - Moderated usability sessions (30-45 min each)
   - Focus areas: Navigation, timeline comprehension, multi-stage workflow

3. **Alpha Testing (During Development):**
   - 3-5 friendly recruiters (internal or trusted partners)
   - Staging environment with real data
   - Focus on edge cases and error handling

4. **Beta Testing (Pre-Launch):**
   - 20+ external recruiters + 50+ candidates
   - Production-like environment
   - Gather quantitative metrics (task completion rate, time-on-task, errors)

---

## 📅 Timeline & Next Steps

**Requested Timeline:**

- **Week 1:** UX expert reviews all stories and raises questions
- **Week 2:** Product team answers questions, UX expert creates wireframes
- **Week 3:** Wireframe review and iteration
- **Week 4:** High-fidelity mockups and interactive prototypes
- **Week 5:** User testing and design validation
- **Week 6:** Final design handoff to engineering

**Immediate Next Steps:**

1. ✅ Review this consultation request document
2. ⏳ UX expert schedules kickoff meeting with product and engineering teams
3. ⏳ UX expert reviews all 8 story files in detail
4. ⏳ UX expert provides written responses to all questions above
5. ⏳ UX expert proposes implementation order with rationale
6. ⏳ Product team and UX expert iterate on open questions

---

## 📞 Contact & Collaboration

**Product Manager:** John (PM)  
**Engineering Lead:** [TBD]  
**UX Expert:** [To be assigned]

**Collaboration Tools:**

- Design files: Figma (shared workspace)
- Feedback: GitHub Issues or Figma comments
- Meetings: Weekly design reviews (1 hour)
- Communication: Slack #epic4-design channel

---

## 📚 Reference Materials

**Existing Documentation:**

- [PRD - Epic 4](../../prd.md#epic-4-advanced-application-management--recruiter-tools)
- [Epic 4 Master File](./epic-4-recruiter-tools.md)
- [Individual Story Files](./ep4-s9-recruiter-job-dashboard.md) through [EP4-S16](./ep4-s16-application-page-ux-redesign.md)
- [Expansion Summary](./EPIC4_EXPANSION_SUMMARY.md)
- [Cleanup Summary](./EPIC4_CLEANUP_SUMMARY.md)

**Design Inspiration:**

- Greenhouse (candidate portal, recruiter interface)
- Lever (hiring stages, timeline views)
- Workable (applicant tracking, job management)
- Linear (clean UI, smooth animations)
- Notion (information hierarchy, modals)

**Brand Guidelines:**

- Primary color: #A16AE8 (purple)
- Secondary color: #8096FD (blue)
- UI library: Material-UI 5+
- Typography: Roboto (Material-UI default)

---

**Let's create exceptional user experiences for Epic 4!** 🚀
