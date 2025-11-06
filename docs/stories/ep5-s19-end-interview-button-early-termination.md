# EP5-S19: End Interview Button & Early Termination

As a candidate,
I want a clear "End Interview" button visible during the interview,
So that I can gracefully exit if needed without closing the browser tab.

## Scope

- Add "End Interview" button visible during `conducting` phase
- Trigger score calculation and session termination when clicked
- Update session status to `completed` via API
- **Persist final score and breakdown to database via end-session API**
- **Store recorded video for later viewing**
- **Add loading state during end-interview process**
- Transition UI to score screen after end
- Provide confirmation modal to prevent accidental clicks

## Acceptance Criteria

1. "End Interview" button appears when `interviewPhase === 'conducting'` or `intro`
2. Button styled distinctly (red/danger variant) to indicate finality
3. Click triggers confirmation modal: "Are you sure you want to end the interview?"
4. Confirming modal calls `controller.endAndScore()`
5. Session status updated to `completed` in database
6. **Final score and breakdown (clarity, correctness, depth) persisted to database**
7. **Recorded video finalized and stored with session for later viewing**
8. **Loading state displayed during finalization process (scoring + video upload)**
9. UI transitions to score screen within 2 seconds of confirmation
10. Canceling modal returns to interview without side effects
11. **Duration calculated and stored** (completedAt - startedAt)

## UI Placement

### Desktop Layout

Button positioned below split-screen video panels, aligned center:

```
┌───────────────────────────────────────┐
│  Candidate Video  │  AI Avatar        │
└───────────────────────────────────────┘
┌───────────────────────────────────────┐
│     [End Interview] (Red Button)      │
└───────────────────────────────────────┘
```

### Mobile Layout

Button pinned to bottom of screen (sticky):

```
┌─────────────────┐
│  Candidate      │
│  Video          │
├─────────────────┤
│  AI Avatar      │
└─────────────────┘
      ...
┌─────────────────┐
│ [End Interview] │ ← Sticky bottom
└─────────────────┘
```

## Confirmation Modal Design

```
┌─────────────────────────────────────────┐
│  End Interview?                         │
│                                         │
│  Are you sure? Your responses will be   │
│  scored immediately and you won't be    │
│  able to continue.                      │
│                                         │
│  [ Cancel ]    [ Yes, End Interview ]  │
└─────────────────────────────────────────┘
```

**Styling**:

- Modal overlay: Semi-transparent dark background
- Modal content: White card with shadow
- "Yes, End Interview" button: Red/danger variant
- "Cancel" button: Neutral/secondary variant

## Technical Implementation

### 1. Add Button to VideoAndControls

```typescript
// In VideoAndControls component
const [showEndModal, setShowEndModal] = useState(false);

return (
  <div className="...">
    {/* Video panels */}

    {/* Controls Section */}
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {(phase === 'intro' || phase === 'conducting') && (
        <PrimaryButton
          onClick={() => setShowEndModal(true)}
          label="End Interview"
          variant="danger"
        />
      )}
    </div>

    {/* Confirmation Modal */}
    {showEndModal && (
      <EndInterviewModal
        onConfirm={handleEndInterview}
        onCancel={() => setShowEndModal(false)}
      />
    )}
  </div>
);
```

### 2. End Interview Handler

```typescript
const [isEndingInterview, setIsEndingInterview] = useState(false);

const handleEndInterview = async () => {
  setShowEndModal(false);
  setIsEndingInterview(true);

  try {
    // Step 1: Stop recording and finalize video
    await recording.stopRecording();

    // Step 2: Wait for all pending uploads to complete
    await recording.waitForCompletion();

    // Step 3: Trigger scoring to calculate final score
    controller.endAndScore();

    // Step 4: Wait for score to be calculated
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 5: Update session status and persist scores + video URL via API
    const sessionId = (window as any).__interviewSessionId;
    if (sessionId) {
      const finalScore = controller.state.finalScore;
      const scoreBreakdown = controller.state.finalScoreBreakdown;
      const videoUrl = recording.getVideoUrl();

      await fetch('/api/interview/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          endedBy: 'candidate',
          reason: 'user_requested',
          finalScore,
          scoreBreakdown,
          videoUrl,
        }),
      });
    }
  } catch (err) {
    console.error('Failed to end interview:', err);
  } finally {
    setIsEndingInterview(false);
  }
};
```

### 3. EndInterviewModal Component

```typescript
// src/components/interview/v2/EndInterviewModal.tsx
interface EndInterviewModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const EndInterviewModal: React.FC<EndInterviewModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 max-w-md mx-4">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          End Interview?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
          Are you sure? Your responses will be scored immediately and you won't be able to continue.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition"
          >
            Yes, End Interview
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 4. Backend API: `/api/interview/end-session`

```typescript
// src/app/api/interview/end-session/route.ts
export async function POST(req: NextRequest) {
  const { sessionId, endedBy, reason, finalScore, scoreBreakdown, videoUrl } =
    await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const db = await getDb();

  // Fetch existing session to calculate duration
  const existingSession = await db
    .collection('interviewSessions')
    .findOne({ sessionId });

  if (!existingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const completedAt = new Date();
  const duration = Math.floor(
    (completedAt.getTime() - existingSession.startedAt.getTime()) / 1000
  );

  const result = await db.collection('interviewSessions').updateOne(
    { sessionId, status: 'in_progress' },
    {
      $set: {
        status: 'completed',
        completedAt,
        duration, // in seconds
        finalScore: finalScore ?? null,
        scoreBreakdown: scoreBreakdown ?? null,
        videoUrl: videoUrl ?? null, // Store video URL for later viewing
        metadata: {
          ...existingSession.metadata,
          endedBy, // 'candidate' | 'system' | 'timeout'
          reason, // 'user_requested' | 'timeout' | 'error'
        },
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { error: 'Session not found or already ended' },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      sessionId,
      finalScore,
      scoreBreakdown,
      duration,
      videoUrl,
    },
    { status: 200 }
  );
}
```

## Behavioral Logic

| Current Phase | Button Visible         | On Click         |
| ------------- | ---------------------- | ---------------- |
| `pre_start`   | ❌ No                  | N/A              |
| `intro`       | ✅ Yes                 | Show modal → End |
| `conducting`  | ✅ Yes                 | Show modal → End |
| `scoring`     | ❌ No (auto-triggered) | N/A              |
| `completed`   | ❌ No                  | N/A              |

## Edge Cases

- User closes browser tab during interview → Session marked `abandoned` via timeout (future story)
- Network fails during end-session API call → Proceed with scoring anyway, retry API in background
- Rapid clicks on "End Interview" → Debounce button, show only one modal
- Interview already ended → Button hidden, show "Interview ended" message

## Accessibility

- Modal focus trap: Tab cycles between Cancel and Confirm buttons
- Escape key closes modal (same as Cancel)
- Screen reader announces: "End Interview confirmation dialog opened"
- Confirm button has `aria-describedby` pointing to warning text

## Analytics Events

- `interview.end_requested`: { sessionId, phase, duration }
- `interview.end_confirmed`: { sessionId, endedBy: 'candidate' }
- `interview.end_cancelled`: { sessionId }

## Tests

- Unit: Button visibility based on phase
- Integration: Click → Modal → Confirm → API call → Score screen
- E2E: Full flow from start → conduct → end → score
- Accessibility: Keyboard navigation, focus management

## Definition of Done

"End Interview" button appears during intro/conducting phases. Clicking opens confirmation modal. Confirming triggers scoring, finalizes video using existing finalize-upload endpoint, updates session status via API, and transitions to score screen. Modal can be canceled without side effects. Verified across desktop and mobile.

## Tasks

- [x] Add "End Interview" button to VideoAndControls
- [x] Create EndInterviewModal component
- [x] Implement confirmation modal logic
- [x] Add keyboard navigation (Escape key)
- [x] Add loading state during end-interview process
- [x] Implement video finalization on end interview
- [x] Wait for all pending uploads to complete
- [x] Store video URL with session
- [x] Create `/api/interview/end-session` endpoint
- [x] Integrate API call in handleEndInterview
- [ ] Add analytics events
- [ ] Add debouncing to prevent double-clicks
- [x] Test modal accessibility
- [x] Verify session status updates in database
- [x] Verify video URL is stored and retrievable

## Dependencies

- **Blocked by**: EP5-S18 (requires session ID from start-session API)
- **Blocks**: EP5-S20 (score screen navigation depends on this)

## Related Stories

- EP5-S18: Start Session API Integration (provides session ID)
- EP5-S20: Dedicated Score Screen Navigation (where user goes after end)
- EP5-S6: Post-Interview Scoring Engine (calculates final score)
