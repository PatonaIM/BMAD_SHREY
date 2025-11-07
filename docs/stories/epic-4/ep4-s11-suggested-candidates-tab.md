# EP4-S11: Suggested Candidates Tab

**Epic:** 4 - Advanced Application Management & Recruiter Tools  
**Story ID:** EP4-S11  
**Created:** November 7, 2025  
**Status:** 🔴 Not Started

---

## User Story

**As a** recruiter,  
**I want** to see suggested candidates who match job requirements but haven't applied yet, alongside high-scoring applicants from other jobs,  
**So that** I can proactively source talent and fill positions faster with qualified candidates.

---

## Acceptance Criteria

### AC1: Suggested Candidates Tab Structure

- [ ] Job detail page includes new "Suggested Candidates" tab alongside "Applications" tab
- [ ] Tab displays two distinct sections: **"Proactive Matches"** and **"High Scorers from Other Jobs"**
- [ ] Section headers clearly distinguish between candidate types
- [ ] Empty state messaging when no suggestions available
- [ ] Tab badge shows total count of suggested candidates

### AC2: Proactive Matches Section

- [ ] Displays candidates who:
  - Have complete profiles (resume uploaded + AI extracted)
  - Match semantic similarity threshold (>70% match score)
  - Have NOT applied to this specific job
  - Are marked as "Open to opportunities" or "Actively looking"
- [ ] **Prioritize candidates who completed AI interviews** (show at top of list with "AI Interview Complete" badge)
- [ ] Candidate cards show: Name, Match Score, Key Skills, Years of Experience, Location, AI Interview Status
- [ ] Match score breakdown available on hover/click (semantic, skills, experience factors)
- [ ] Cards sorted by: AI Interview Complete (first), then Match Score (highest first)
- [ ] Maximum 50 proactive matches displayed (paginated)

### AC3: High Scorers from Other Jobs Section

- [ ] Displays candidates who:
  - Applied to different jobs in the past 90 days
  - Achieved application scores >75 (after AI interview boost)
  - Have relevant skills for current job (>50% skill overlap)
  - Have NOT applied to this specific job
- [ ] Candidate cards show: Name, Previous Job Applied, Score from Previous Application, Overlapping Skills
- [ ] Cards sorted by previous application score (highest first)
- [ ] Maximum 30 high scorers displayed (paginated)
- [ ] Indicator if candidate is currently in active hiring process elsewhere

### AC4: Candidate Card Interactions

- [ ] Clicking candidate card opens candidate profile preview modal (read-only)
- [ ] "Invite to Apply" button on each candidate card
- [ ] "View Full Profile" link navigates to detailed candidate profile page
- [ ] "Dismiss" button removes candidate from suggestions (with undo option)
- [ ] Bulk select checkbox for inviting multiple candidates at once

### AC5: Invite to Apply Functionality

- [ ] Clicking "Invite to Apply" opens invitation modal
- [ ] Modal pre-fills with job details and recruiter message template
- [ ] Recruiter can customize invitation message
- [ ] Invitation sent as in-app notification + email to candidate
- [ ] Invitation tracking shows status: Sent, Viewed, Applied, Declined
- [ ] Invited candidates move to separate "Invited" subsection
- [ ] No limit on invitations (recruiters can invite as many candidates as needed)

### AC6: Filtering & Sorting

- [ ] Filter by location (remote, specific city, willing to relocate)
- [ ] Filter by years of experience (entry-level, mid-level, senior, lead)
- [ ] Filter by availability (immediate, 2 weeks, 30 days, 60+ days)
- [ ] Filter by match score range (70-79, 80-89, 90-100)
- [ ] Sort options: Match Score (high to low), Experience (most to least), Recently Updated

### AC7: Performance & UX

- [ ] Suggestions load within 3 seconds of tab access
- [ ] Lazy loading for candidate profile previews
- [ ] Real-time updates when candidate applies (remove from suggestions)
- [ ] Responsive design for desktop and tablet (mobile shows condensed view)
- [ ] Loading skeleton for async data fetch

---

## Definition of Done (DoD)

### Backend Implementation

- [ ] **Matching Algorithm:**

  ```typescript
  interface ProactiveMatchCriteria {
    jobId: ObjectId;
    semanticSimilarityThreshold: number; // 0.70
    hasCompleteProfile: boolean; // true
    notAppliedToJob: boolean; // true
    availabilityStatus: 'open' | 'active'; // open to opportunities
    limit: number; // 50
  }

  interface HighScorerCriteria {
    jobId: ObjectId;
    minPreviousScore: number; // 75
    minSkillOverlap: number; // 0.50 (50%)
    lookbackDays: number; // 90
    notAppliedToJob: boolean; // true
    limit: number; // 30
  }
  ```

- [ ] **Database Queries:**
  - Proactive Matches: Vector search on job description embedding vs. candidate resume embeddings
  - High Scorers: Join applications + profiles + jobs collections with score/skill filtering
  - Optimize with indexes: `{ jobId: 1, score: -1, createdAt: -1 }`
  - Cache results for 6 hours (refresh on job description update)

- [ ] **API Endpoints:**
  - `GET /api/recruiter/jobs/:jobId/suggested-candidates` - Fetch both sections
  - `POST /api/recruiter/jobs/:jobId/invite-candidate` - Send invitation
  - `POST /api/recruiter/jobs/:jobId/dismiss-suggestion/:candidateId` - Remove suggestion
  - `GET /api/recruiter/jobs/:jobId/invitations` - Track invitation status

- [ ] **Invitation System:**
  - `candidateInvitations` collection: `{ jobId, candidateId, recruiterId, message, status, sentAt, viewedAt, respondedAt }`
  - Email template: "You've been invited to apply for [Job Title] at [Company]"
  - In-app notification: "A recruiter thinks you're a great fit for [Job Title]"
  - Track view/click metrics for invitation effectiveness

### Frontend Implementation

- [ ] **Components:**
  - `SuggestedCandidatesTab.tsx` - Main tab container
  - `ProactiveMatchesSection.tsx` - First section with proactive candidates
  - `HighScorersSection.tsx` - Second section with cross-job high performers
  - `SuggestedCandidateCard.tsx` - Individual candidate display
  - `InviteToApplyModal.tsx` - Invitation composition interface
  - `CandidateProfilePreview.tsx` - Quick profile view modal

- [ ] **State Management:**
  - React Query for data fetching with 6-hour cache
  - Local state for filters and sorting
  - Optimistic updates for dismiss/invite actions
  - Toast notifications for invitation success/failure

- [ ] **Styling:**
  - Material-UI cards with clear section dividers
  - Match score visualization (progress bar or circular indicator)
  - Skill chips with color-coding (matched vs. missing)
  - Skeleton loaders for async content

### Matching Algorithm Details

- [ ] **Proactive Match Score Calculation:**

  ```typescript
  function calculateProactiveMatchScore(candidate, job) {
    const semanticScore =
      cosineSimilarity(candidate.resumeEmbedding, job.descriptionEmbedding) *
      0.4; // 40%

    const skillScore =
      calculateSkillOverlap(candidate.skills, job.requiredSkills) * 0.35; // 35%

    const experienceScore =
      calculateExperienceMatch(
        candidate.yearsExperience,
        job.requiredYearsExperience
      ) * 0.15; // 15%

    const additionalScore = calculateAdditionalFactors(candidate, job) * 0.1; // 10% (location, industry, etc.)

    return (
      (semanticScore + skillScore + experienceScore + additionalScore) * 100
    );
  }
  ```

- [ ] **High Scorer Identification:**
  - Query applications where `score >= 75` in last 90 days
  - Calculate skill overlap between previous job and current job
  - Filter candidates where `skillOverlap >= 50%`
  - Exclude candidates already in active process for any job

### Testing

- [ ] **Unit Tests:**
  - Match score calculation logic
  - Skill overlap algorithm
  - Invitation status tracking
  - Filter and sort functions

- [ ] **Integration Tests:**
  - API endpoint responses with mock candidate data
  - Vector search query performance (< 2 seconds for 1000s of candidates)
  - Invitation email delivery
  - Real-time suggestion updates when candidate applies

- [ ] **E2E Tests:**
  - Recruiter views suggestions and invites candidate
  - Candidate receives invitation and applies
  - Suggested candidate is removed after application
  - Dismiss suggestion removes candidate from view
  - Bulk invite sends multiple invitations correctly

### Performance Optimization

- [ ] Cache proactive matches for 6 hours (or until job description changes)
- [ ] Batch candidate profile queries (fetch 20 at a time)
- [ ] Lazy load candidate previews (only fetch on modal open)
- [ ] Index optimization for vector search queries
- [ ] Consider Redis caching for high-traffic jobs

---

## Technical Notes

### Vector Search Query Example (MongoDB Atlas)

```typescript
const proactiveMatches = await db.collection('users').aggregate([
  {
    $vectorSearch: {
      queryVector: jobDescriptionEmbedding,
      path: 'profile.resumeEmbedding',
      numCandidates: 200,
      limit: 50,
      index: 'vector_index',
      filter: {
        'profile.isComplete': true,
        availabilityStatus: { $in: ['open', 'active'] },
      },
    },
  },
  {
    $lookup: {
      from: 'applications',
      let: { userId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$userId', '$$userId'] },
                { $eq: ['$jobId', ObjectId(jobId)] },
              ],
            },
          },
        },
      ],
      as: 'existingApplications',
    },
  },
  {
    $match: { existingApplications: { $size: 0 } },
  },
  {
    $addFields: {
      matchScore: { $multiply: ['$score', 100] },
    },
  },
  {
    $project: {
      name: 1,
      email: 1,
      'profile.skills': 1,
      'profile.experience': 1,
      'profile.location': 1,
      matchScore: 1,
    },
  },
]);
```

### High Scorer Query Example

```typescript
const highScorers = await db.collection('applications').aggregate([
  {
    $match: {
      score: { $gte: 75 },
      status: { $in: ['Rejected', 'Withdrawn'] }, // Not in active process
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'candidate',
    },
  },
  {
    $unwind: '$candidate',
  },
  {
    $lookup: {
      from: 'jobs',
      localField: 'jobId',
      foreignField: '_id',
      as: 'previousJob',
    },
  },
  {
    $unwind: '$previousJob',
  },
  {
    $addFields: {
      skillOverlap: {
        $size: {
          $setIntersection: [
            '$candidate.profile.skills.name',
            currentJob.requiredSkills,
          ],
        },
      },
    },
  },
  {
    $match: {
      skillOverlap: { $gte: Math.ceil(currentJob.requiredSkills.length * 0.5) },
    },
  },
  {
    $sort: { score: -1 },
  },
  {
    $limit: 30,
  },
]);
```

---

## Dependencies

- **Requires:**
  - EP2-S4 (Semantic vectorization must be complete)
  - EP2-S5 (Match score calculation algorithm)
  - EP4-S9 (Recruiter job subscription for context)
- **Blocks:** None (standalone feature)
- **Related:** EP4-S12, EP4-S13 (Application timeline where invited candidates appear)

---

## UX Considerations

### Consult UX Expert For:

- Section layout (side-by-side vs. stacked sections)
- Candidate card information density (what to show vs. hide)
- Invitation modal flow (single-step vs. multi-step wizard)
- Match score visualization (bar, circle, badge, or numeric)
- Empty state messaging and illustrations
- Mobile responsiveness strategy

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation for candidate cards and filters
- Screen reader support for match scores and card content
- Focus indicators for all interactive elements
- ARIA labels for invitation status icons

---

## Success Metrics

- **Discovery:** 70% of recruiters view Suggested Candidates tab within first week
- **Invitation Rate:** 30% of suggested candidates receive invitations
- **Conversion:** 15% of invited candidates apply to job
- **Quality:** 40% of invited applicants score >70 (validation of matching accuracy)
- **Time-to-Fill:** 20% reduction in average time-to-fill for jobs using proactive sourcing

---

## Future Enhancements

- AI-powered invitation message generation (personalized based on candidate profile)
- Candidate sourcing from external platforms (LinkedIn, GitHub)
- "Similar candidates" recommendation based on top applicants
- Predictive analytics: likelihood candidate will apply if invited
- Automated invitation campaigns (send invitations to top 10 matches automatically)
- Integration with recruiter CRM tools

---

## Notes

- Consider ethical implications of proactive matching (candidate consent/privacy)
- Ensure candidates can opt-out of being suggested (privacy settings)
- Monitor invitation acceptance rates to tune matching thresholds
- Future: Add "Why was I suggested?" explanation for transparency
