# Matching Components

This directory contains UI components and utilities for displaying job-candidate match scores throughout the application.

## Overview

The matching system calculates compatibility scores between job postings and candidate profiles using a multi-factor algorithm. These components provide a consistent, accessible way to display match scores across the application.

## Components

### `MatchScoreBadge`

A compact, color-coded badge that displays match scores inline with job cards.

**Usage:**

```tsx
import { MatchScoreBadge } from '@/components/matching';

// Basic usage
<MatchScoreBadge score={78} />

// With label and click handler
<MatchScoreBadge
  score={85}
  showLabel
  onClick={() => setModalOpen(true)}
/>

// Different sizes
<MatchScoreBadge score={92} size="sm" />
<MatchScoreBadge score={92} size="md" /> // default
<MatchScoreBadge score={92} size="lg" />
```

**Props:**

| Prop        | Type                   | Default  | Description                                 |
| ----------- | ---------------------- | -------- | ------------------------------------------- |
| `score`     | `number`               | required | Match score from 0-100                      |
| `size`      | `'sm' \| 'md' \| 'lg'` | `'md'`   | Badge size variant                          |
| `showLabel` | `boolean`              | `false`  | Show "Match:" label before score            |
| `onClick`   | `() => void`           | -        | Optional click handler (shows hover effect) |

**Color Coding:**

- **Green (≥85%)**: Excellent Match
- **Yellow (60-85%)**: Good Match
- **Red (<60%)**: Weak Match

**Accessibility:**

- Full ARIA labels describing score and match quality
- Keyboard accessible when clickable
- High contrast colors in dark mode

---

### `ScoreBreakdownModal`

A detailed modal that shows the full match calculation breakdown, including component scores, matched/missing skills, reasoning, and improvement recommendations.

**Usage:**

```tsx
import { ScoreBreakdownModal } from '@/components/matching';

<ScoreBreakdownModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  match={jobCandidateMatch}
  jobTitle="Senior Software Engineer"
/>;
```

**Props:**

| Prop       | Type                | Default  | Description                           |
| ---------- | ------------------- | -------- | ------------------------------------- |
| `isOpen`   | `boolean`           | required | Controls modal visibility             |
| `onClose`  | `() => void`        | required | Called when modal should close        |
| `match`    | `JobCandidateMatch` | required | Full match data from matching service |
| `jobTitle` | `string`            | required | Job title to display in header        |

**Features:**

- **Overall Score**: Large progress bar with confidence percentage
- **Component Breakdown**: 3 sub-scores (skills, experience, other factors)
- **Skills Analysis**: Visual badges for matched (green) and missing (red) skills
- **Reasoning**: Human-readable explanations from the matching algorithm
- **Recommendations**: Dynamic improvement tips based on score thresholds
- **Clear Explanation**: Shows how weights and scores combine
- **Keyboard Support**: Escape key to close
- **Body Scroll Lock**: Prevents background scrolling when open
- **Sticky Header/Footer**: For long content

---

## Utilities

### `profileTransformer`

Helper functions for working with profile data and matching calculations.

#### `extractedProfileToCandidateProfile`

Converts an `ExtractedProfile` (from resume parsing) to a `CandidateProfile` (for matching).

```typescript
import { extractedProfileToCandidateProfile } from '@/components/matching';

const candidateProfile = extractedProfileToCandidateProfile(
  userId,
  extractedData,
  vectorEmbeddings,
  preferences
);

const match = await matchingService.calculateMatch(job, candidateProfile);
```

#### `isProfileReadyForMatching`

Type guard to check if an extracted profile is ready for matching calculations.

```typescript
import { isProfileReadyForMatching } from '@/components/matching';

if (isProfileReadyForMatching(extractedProfile)) {
  // Safe to use for matching
} else {
  console.error('Profile not ready:', extractedProfile.extractionStatus);
}
```

#### `calculateProfileCompleteness`

Calculates a completeness score (0-100) to help users understand how to improve their profile.

```typescript
import { calculateProfileCompleteness } from '@/components/matching';

const score = calculateProfileCompleteness(extractedProfile);
if (score < 70) {
  showNotification('Complete your profile for better matches!');
}
```

**Scoring Breakdown:**

- Summary (15 points): Full credit for 20+ characters
- Skills (30 points): Full credit for 5+ skills, +5 bonus for proficiency levels
- Experience (35 points): Full credit for 3+ entries, +5 bonus for detailed descriptions
- Education (20 points): Full credit for 1+ entry

#### `getProfileSearchTerms`

Extracts searchable keywords from a profile for quick filtering.

```typescript
import { getProfileSearchTerms } from '@/components/matching';

const terms = getProfileSearchTerms(extractedProfile);
// ['react', 'typescript', 'google', 'stanford', 'computer science', ...]
```

---

## Integration Example

Complete example showing badge + modal integration:

```tsx
import { useState } from 'react';
import { MatchScoreBadge, ScoreBreakdownModal } from '@/components/matching';
import type { JobCandidateMatch } from '@/components/matching';

export function JobCard({
  job,
  match,
}: {
  job: Job;
  match: JobCandidateMatch;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.company}</p>

      <MatchScoreBadge
        score={match.score.overall}
        showLabel
        onClick={() => setShowModal(true)}
      />

      <ScoreBreakdownModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        match={match}
        jobTitle={job.title}
      />
    </div>
  );
}
```

---

## Matching Algorithm

The matching algorithm uses these weights to calculate the overall score:

| Factor               | Weight | Components                                                                |
| -------------------- | ------ | ------------------------------------------------------------------------- |
| **Skills Alignment** | 60%    | Matched skills count, proficiency levels, skill match ratio (PRIMARY)     |
| **Experience Match** | 25%    | Level alignment, domain relevance, recency boost                          |
| **Other Factors**    | 15%    | Location preference, employment type match, salary alignment, company fit |

**Note:** Semantic similarity (vector embeddings) is currently disabled as job embeddings are not yet implemented.

**How it works:**

1. Each component is scored 0-100%
2. The overall score = (Skills × 0.60) + (Experience × 0.25) + (Other × 0.15)
3. Example: Skills=80%, Experience=60%, Other=70% → Overall = 48 + 15 + 10.5 = 73.5%

**Performance Target**: <500ms per calculation

---

## Testing

Unit tests are provided for the utility functions in `profileTransformer.test.ts`.

Run tests:

```bash
npm test -- src/components/matching/profileTransformer.test.ts
```

**Test Coverage:**

- ✅ Profile transformation edge cases
- ✅ Profile readiness validation
- ✅ Completeness scoring algorithm
- ✅ Search term extraction

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Color Contrast**: 4.5:1 minimum for text, works in dark mode
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Screen Readers**: Semantic HTML and proper roles
- **Focus Management**: Visible focus indicators

---

## Future Enhancements (Sprint 2-5)

### Sprint 2: Batch Scoring API

- `/api/jobs/batch-score` endpoint
- In-memory caching with 24h TTL
- Cache invalidation on profile updates

### Sprint 3: Homepage Integration

- Add `MatchScoreBadge` to homepage job cards
- Batch fetch scores on page load
- Skeleton loaders while calculating

### Sprint 4: Dashboard Integration

- Match scores in "Latest Jobs" section
- Match scores in "Your Applications" section
- Sort by match score feature

### Sprint 5: Polish & Optimization

- Animations and transitions
- Loading states
- Error boundaries
- Performance monitoring

---

## Dependencies

- **React 18+**: For component rendering
- **Tailwind CSS**: For styling (with dark mode support)
- **TypeScript**: For type safety

**Type Dependencies:**

- `@/shared/types/matching`: JobCandidateMatch, CandidateProfile, MatchScore, MatchFactors
- `@/shared/types/profile`: ExtractedProfile, ExtractedSkill, ExperienceEntry, EducationEntry

---

## File Structure

```
src/components/matching/
├── index.ts                      # Public API exports
├── MatchScoreBadge.tsx           # Badge component
├── ScoreBreakdownModal.tsx       # Modal component
├── profileTransformer.ts         # Utility functions
├── profileTransformer.test.ts    # Unit tests
└── README.md                     # This file
```

---

## Questions?

For implementation details, see:

- **Matching Service**: `src/services/ai/jobCandidateMatching.ts`
- **Type Definitions**: `src/shared/types/matching.ts`
- **Epic 2 Stories**: `docs/stories/epic-2-ai-profile-system.md`
