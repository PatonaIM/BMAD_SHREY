# EP3-S4: Interview Q&A Transcription & Summary

**Epic:** 3 - Interactive AI Interview System  
**Story ID:** EP3-S4  
**Priority:** High  
**Estimated Effort:** 5 story points  
**Dependencies:** EP3-S0 (AI Interview POC)

---

## User Story

**As a** recruiter or hiring manager,  
**I want to** see a summary of interview questions and answers when reviewing applications,  
**So that** I can quickly understand candidate responses without watching the full video.

**As a** candidate,  
**I want to** review my interview responses in text form,  
**So that** I can see what I said during the interview.

---

## Problem Statement

Currently, interview recordings are video-only with no text transcription. Recruiters must watch entire videos to understand candidate responses. This is time-consuming and prevents quick scanning of interview content.

---

## Acceptance Criteria

### 1. Real-time Transcription Capture

- [x] Capture AI questions in real-time during interview
- [ ] Capture candidate answers using OpenAI Realtime API transcription
- [ ] Store question-answer pairs with timestamps
- [ ] Associate each Q&A with the session in MongoDB

**Data Structure:**

```typescript
interface InterviewQAPair {
  questionId: string;
  question: string;
  questionCategory: 'technical' | 'behavioral' | 'experience' | 'situational';
  questionAskedAt: Date; // Timestamp when AI asked the question
  answerText: string; // Transcribed candidate response
  answerStartedAt: Date; // When candidate started speaking
  answerEndedAt: Date; // When candidate finished speaking
  answerDuration: number; // Duration in seconds
  confidence?: number; // Transcription confidence score (0-1)
}

interface InterviewSession {
  // ... existing fields
  qaTranscript: InterviewQAPair[]; // NEW
  interviewSummary?: string; // NEW - 2-3 sentence overview
  summaryGeneratedAt?: Date; // NEW
}
```

### 2. Post-Interview Summary Generation

- [ ] After interview completion, generate 2-3 sentence summary using GPT-4
- [ ] Summary includes: overall performance, key strengths, areas mentioned
- [ ] Store summary in InterviewSession document
- [ ] Summary generation happens asynchronously (don't block interview completion)

**Example Summary:**

> "The candidate demonstrated strong technical knowledge in React and Node.js, providing detailed examples of microservices architecture. They showed good problem-solving skills when discussing database optimization challenges. Communication was clear and confident throughout the 12-minute interview."

**API Endpoint:**

```typescript
POST /api/interview/generate-summary
Body: { sessionId: string }
Response: { summary: string, generatedAt: Date }
```

### 3. Application Detail Page - Interview Summary Display

- [ ] Add "Interview Summary" card to application detail page
- [ ] Show 2-3 sentence summary at the top
- [ ] Display collapsible Q&A transcript below summary
- [ ] Each Q&A shows: question, answer text, duration, timestamp
- [ ] Link to full video recording
- [ ] Show transcription confidence score if low (<0.8)

**UI Components:**

```typescript
<InterviewSummaryCard
  summary={session.interviewSummary}
  qaTranscript={session.qaTranscript}
  recordingUrl={recordingUrl}
  duration={session.duration}
  completedAt={session.completedAt}
/>
```

### 4. Interview Playback - Transcript Sync

- [ ] Display transcript alongside video in InterviewPlayer
- [ ] Highlight current Q&A pair based on video timestamp
- [ ] Click on Q&A to jump to that point in video
- [ ] Search functionality to find specific keywords in transcript

### 5. Data Storage & Retrieval

- [ ] Update MongoDB InterviewSession schema with new fields
- [ ] Store Q&A pairs as embedded documents (not separate collection)
- [ ] Index on sessionId and timestamps for efficient retrieval
- [ ] Add migration script for existing sessions (if any)

---

## Technical Implementation

### Service: Interview Transcription Service

**File:** `src/services/ai/interviewTranscription.ts`

```typescript
export class InterviewTranscriptionService {
  /**
   * Process real-time transcript from OpenAI Realtime API
   */
  async captureAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    startTime: Date,
    endTime: Date,
    confidence?: number
  ): Promise<void>;

  /**
   * Generate interview summary using GPT-4
   */
  async generateSummary(
    sessionId: string,
    qaTranscript: InterviewQAPair[]
  ): Promise<string>;
}
```

**GPT-4 Prompt for Summary:**

```
You are analyzing an AI interview transcript. Generate a 2-3 sentence summary
covering:
1. Overall technical/behavioral competence demonstrated
2. Key strengths or notable responses
3. Communication style and confidence level

Interview Q&A:
[Insert full transcript]

Generate a concise, professional summary suitable for recruiters.
```

### API Updates

**Update:** `POST /api/interview/end-session`

```typescript
// After recording upload
await interviewTranscriptionService.generateSummary(
  sessionId,
  session.qaTranscript
);
```

**New:** `GET /api/interview/[sessionId]/transcript`

```typescript
// Returns full Q&A transcript with timestamps
```

### WebSocket Updates

**Update:** `src/services/ai/realtimeWebSocket.ts`

```typescript
// In event handlers
case 'conversation.item.input_audio_transcription.completed':
  // Capture candidate answer transcription
  await transcriptionService.captureAnswer(
    sessionId,
    currentQuestionId,
    event.transcript,
    answerStartTime,
    new Date(),
    event.confidence
  );
  break;
```

---

## UI Components

### InterviewSummaryCard Component

**File:** `src/components/interview/InterviewSummaryCard.tsx`

**Features:**

- Displays 2-3 sentence summary
- Expandable Q&A transcript
- "Watch Full Interview" button
- Duration and completion timestamp
- Copy transcript button

### InterviewTranscriptViewer Component

**File:** `src/components/interview/InterviewTranscriptViewer.tsx`

**Features:**

- Scrollable Q&A list
- Click to jump to video timestamp
- Search/filter questions
- Highlight current Q&A during playback
- Export as PDF option

---

## Testing Requirements

### Unit Tests

- [ ] TranscriptionService.captureAnswer()
- [ ] TranscriptionService.generateSummary()
- [ ] GPT-4 prompt generates valid summaries

### Integration Tests

- [ ] End-to-end: Interview → transcription → summary generation
- [ ] API: POST /api/interview/generate-summary
- [ ] API: GET /api/interview/[sessionId]/transcript

### Manual Testing

- [ ] Complete interview and verify Q&A capture
- [ ] Verify summary quality (2-3 sentences, professional tone)
- [ ] Check transcript sync with video playback
- [ ] Test search functionality in transcript
- [ ] Verify low confidence warnings appear correctly

---

## Success Metrics

- **Transcription Accuracy:** >95% word accuracy for clear speech
- **Summary Quality:** Recruiters find summaries useful in >80% of cases
- **Time Savings:** Recruiters spend 50% less time reviewing interviews
- **Candidate Satisfaction:** Candidates can review their responses

---

## Non-Goals

- Real-time transcription display during interview (may distract candidate)
- Sentiment analysis of answers
- Automated scoring based on transcript content
- Multi-language transcription (English only for MVP)

---

## Open Questions

- [ ] Should candidates see their transcript immediately or after recruiter review?
- [ ] Should we allow editing of transcriptions for accuracy?
- [ ] What confidence threshold triggers a "low confidence" warning?
- [ ] Should summary mention specific technologies/skills mentioned?

---

## Dependencies

- OpenAI Realtime API (already implemented)
- OpenAI GPT-4 API (for summary generation)
- MongoDB InterviewSession schema updates
- Azure Blob Storage (no changes needed)

---

## Rollout Plan

**Phase 1:** Transcription capture (passive - store but don't display)  
**Phase 2:** Summary generation (test quality with internal team)  
**Phase 3:** UI display on application detail page  
**Phase 4:** Full transcript viewer with search

---

## Cost Estimation

**OpenAI Costs:**

- Realtime API transcription: Included in existing audio streaming costs
- GPT-4 summary generation: ~500 tokens per summary
  - Cost: $0.0025 per interview summary (500 tokens × $5/1M)
  - Expected volume: 100 interviews/month = $0.25/month

**Storage:**

- Text transcripts: ~5KB per interview (negligible)
- MongoDB storage: <1MB additional per 100 interviews

**Total Additional Cost:** <$1/month for 100 interviews
