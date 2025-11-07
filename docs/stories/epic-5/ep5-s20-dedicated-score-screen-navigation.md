# EP5-S20: Dedicated Score Screen Navigation & Display

As a candidate,
I want to see my interview results on a clean, dedicated screen after completion,
So that I can review my performance breakdown and next steps.

## Scope

- Create new route: `/interview/score/[sessionId]`
- Auto-navigate to score screen when `interviewPhase === 'completed'`
- Display final score, breakdown (clarity, correctness, depth), and summary feedback
- **Calculate and display score boost (interview performance → match score improvement)**
- **Update application's match score with boost applied**
- Show interview metadata: duration, questions answered, difficulty progression
- Provide "Return to Application" and "Go to Dashboard" buttons
- Persist score and boost in database (already handled by S18)

## Acceptance Criteria

1. When interview completes (phase → `completed`), auto-redirect to `/interview/score/[sessionId]`
2. Score screen loads within 1 second
3. Displays final score as large prominent number (0-100)
4. Shows breakdown: clarity, correctness, depth (each 0-1 scale, converted to %)
5. **Displays score boost: interview score impact on match score (max +15 points)**
6. **Shows before/after match score comparison**
7. Displays interview metadata: duration (MM:SS), questions answered, difficulty tier
8. Shows AI-generated summary feedback (if available)
9. "Return to Application" button navigates back to `/applications/[applicationId]`
10. "Go to Dashboard" button navigates to `/dashboard`
11. If session not found, show 404 error page
12. **Application page displays score boost badge and updated match score**

## Score Screen Design

### Desktop Layout

```
┌────────────────────────────────────────────────────┐
│  ✅ Interview Complete                             │
│                                                    │
│           ┌─────────────────┐                     │
│           │       85        │  Large Score        │
│           │      /100       │                     │
│           └─────────────────┘                     │
│                                                    │
│  🎯 Match Score Improvement                       │
│  ┌────────────────────────────────────────────┐  │
│  │ Before Interview:    72%                   │  │
│  │ Score Boost:        +13%  (from interview) │  │
│  │ New Match Score:     85%  ⬆️               │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  Performance Breakdown                             │
│  ┌────────────────────────────────────────────┐  │
│  │ Clarity:        82%  ███████████░░░░░      │  │
│  │ Correctness:    88%  ████████████░░░       │  │
│  │ Depth:          85%  ███████████░░░░       │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  Interview Summary                                 │
│  Duration: 12:34                                  │
│  Questions Answered: 5                            │
│  Difficulty Progression: T3 → T4                  │
│                                                    │
│  Feedback:                                         │
│  "Strong grasp of system design principles..."    │
│                                                    │
│  [ Return to Dashboard ]                          │
└────────────────────────────────────────────────────┘
```

### Mobile Layout

Stacked vertically with full-width sections.

## Route Implementation

### 1. Page Component

```typescript
// src/app/interview/score/[sessionId]/page.tsx
import { getDb } from '@/lib/mongodb';
import { notFound } from 'next/navigation';
import { applicationRepo } from '@/data-access/repositories/applicationRepo';

interface ScorePageProps {
  params: { sessionId: string };
}

export default async function InterviewScorePage({ params }: ScorePageProps) {
  const { sessionId } = params;

  const db = await getDb();
  const session = await db.collection('interviewSessions').findOne({ sessionId });

  if (!session || session.status !== 'completed') {
    notFound();
  }

  const { finalScore, scoreBreakdown, duration, metadata, createdAt, completedAt } = session;

  // Fetch application to get before/after scores
  const application = await applicationRepo.findById(session.applicationId);
  const scoreBeforeInterview = application?.scoreBeforeInterview;
  const scoreAfterInterview = application?.scoreAfterInterview;
  const scoreBoost = scoreAfterInterview && scoreBeforeInterview
    ? scoreAfterInterview - scoreBeforeInterview
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-neutral-950 dark:to-neutral-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <ScoreCard
          score={finalScore ?? 0}
          breakdown={scoreBreakdown}
          duration={duration}
          questionsAnswered={session.events?.filter(e => e.type === 'question.ready').length ?? 0}
          difficulty={metadata?.difficultyTier ?? 3}
          feedback={session.aiSummary}
          scoreBeforeInterview={scoreBeforeInterview}
          scoreAfterInterview={scoreAfterInterview}
          scoreBoost={scoreBoost}
        />
        <div className="mt-8 text-center">
          <a
            href="/applications"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 2. ScoreCard Component

```typescript
// src/components/interview/v2/ScoreCard.tsx
interface ScoreCardProps {
  score: number;
  breakdown?: { clarity: number; correctness: number; depth: number };
  duration?: number; // seconds
  questionsAnswered: number;
  difficulty: number;
  feedback?: string;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  scoreBoost?: number;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  score,
  breakdown,
  duration = 0,
  questionsAnswered,
  difficulty,
  feedback,
  scoreBeforeInterview,
  scoreAfterInterview,
  scoreBoost,
}) => {
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium mb-4">
          ✅ Interview Complete
        </div>
        <div className="text-7xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
          {score}
        </div>
        <div className="text-2xl text-neutral-500 dark:text-neutral-400">
          / 100
        </div>
      </div>

      {/* Score Boost Section */}
      {scoreBeforeInterview !== undefined &&
       scoreAfterInterview !== undefined &&
       scoreBoost !== undefined && (
        <div className="mb-8 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            🎯 Match Score Improvement
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Before Interview
              </div>
              <div className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                {scoreBeforeInterview}%
              </div>
            </div>
            <div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                Score Boost
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +{scoreBoost}%
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                New Match Score
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                {scoreAfterInterview}%
                <span className="text-lg">⬆️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown */}
      {breakdown && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Performance Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-neutral-700 dark:text-neutral-300">
                    {key}
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-4 mb-8 text-center">
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatDuration(duration)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Duration
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {questionsAnswered}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Questions
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            T{difficulty}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Difficulty
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Feedback
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {feedback}
          </p>
        </div>
      )}
    </div>
  );
};
```

### 3. Auto-Navigation Logic

```typescript
// In ModernInterviewPage.tsx or useInterviewController
useEffect(() => {
  if (controller.state.interviewPhase === 'completed') {
    const sessionId = (window as any).__interviewSessionId;
    if (sessionId) {
      // Wait 2 seconds to show final score in-place, then navigate
      setTimeout(() => {
        window.location.href = `/interview/score/${sessionId}`;
      }, 2000);
    }
  }
}, [controller.state.interviewPhase]);
```

## Data Flow

1. Interview ends (via S19 or natural completion)
2. `controller.endAndScore()` called
3. Scoring logic updates `finalScore` and `scoreBreakdown` in state
4. Backend API `/api/interview/end-session` persists score to DB
5. **Backend calculates score boost: `min(interviewScore * 0.15, 15)` (max 15 points)**
6. **Backend updates application: `scoreBeforeInterview`, `scoreAfterInterview`, `matchScore`**
7. Client waits 2s (optional: show inline score preview)
8. Navigate to `/interview/score/[sessionId]`
9. Score page fetches session and application from DB and renders with boost

## Score Boost Calculation

```typescript
// In /api/interview/end-session
const interviewScore = finalScore ?? 0; // 0-100
const scoreBoost = Math.min(interviewScore * 0.15, 15); // Max 15 point boost

// Get current match score from application
const application = await applicationRepo.findById(session.applicationId);
const originalMatchScore = application.matchScore;

// Calculate new match score (capped at 100)
const newMatchScore = Math.min(originalMatchScore + scoreBoost, 100);

// Update application with interview completion data
await applicationRepo.updateInterviewCompletion(
  session.applicationId,
  interviewScore,
  originalMatchScore
);
// This sets: scoreBeforeInterview, scoreAfterInterview, matchScore
```

## Edge Cases

- Session not found → Show 404 page with "Session expired or invalid"
- Session in progress → Redirect to interview page
- Score not yet calculated → Show loading state, poll for score
- Malformed sessionId → Validate format, show error

## Accessibility

- Score number has `aria-label="Final score: 85 out of 100"`
- Breakdown bars have text equivalents for screen readers
- Focus moves to "Return to Dashboard" button on page load
- Keyboard navigable

## SEO Considerations

- `<title>Interview Score - {score}/100</title>`
- `<meta name="robots" content="noindex">` (private results)

## Analytics Events

- `interview.score_viewed`: { sessionId, score, duration }
- `interview.dashboard_return`: { sessionId }

## Tests

- Unit: ScoreCard component rendering with various props
- Integration: Navigate from completed interview → score page
- E2E: Full interview flow ending at score screen
- Edge case: 404 for invalid session ID

## Definition of Done

After interview completion, candidate auto-navigates to `/interview/score/[sessionId]` showing final score, breakdown, metadata, and feedback. "Return to Dashboard" button works. Score data persisted in database. Verified in production-like environment.

## Tasks

- [x] Create `/interview/score/[sessionId]/page.tsx` route
- [x] Implement ScoreCard component with breakdown visualization
- [x] Add score boost display section to ScoreCard
- [x] Add auto-navigation logic in useInterviewController
- [x] Persist final score to database (already in useInterviewController)
- [x] **Update `/api/interview/end-session` to calculate score boost**
- [x] **Update application with score boost via `updateInterviewCompletion`**
- [x] Add session and application data fetch in score page
- [x] Implement 404 handling for invalid sessions
- [x] Style score screen (gradient background, animations, boost highlight)
- [x] Add "Return to Application" and "Go to Dashboard" buttons
- [ ] **Verify ScoreComparisonCard on application page displays boost correctly**
- [ ] Add analytics events
- [ ] Test navigation flow end-to-end with score boost

## Dependencies

- **Blocked by**: EP5-S19 (needs session completion trigger)
- **Blocked by**: EP5-S18 (needs session ID from start-session)

## Related Stories

- EP5-S6: Post-Interview Scoring Engine (calculates scores)
- EP5-S18: Start Session API Integration (creates session record)
- EP5-S19: End Interview Button (triggers navigation to score screen)
