# 3. Tech Stack Alignment

## Existing Technologies (Retained)

| Layer            | Technology     | Version | Epic 4 Usage                          |
| ---------------- | -------------- | ------- | ------------------------------------- |
| Framework        | Next.js        | 15.0.0  | New `/recruiter` pages, API routes    |
| Language         | TypeScript     | 5.3.3   | All new code strict mode              |
| API Layer        | tRPC           | 10.45   | `recruiterRouter` with 12 procedures  |
| Database         | MongoDB Atlas  | 7.0+    | 5 new collections, timeline extension |
| UI Library       | Material-UI    | 5.14+   | Custom inline components              |
| Auth             | NextAuth.js    | 4.24    | Google OAuth provider added           |
| AI (Existing)    | OpenAI         | 4.28.0  | Vector search for suggestions         |
| State Management | TanStack Query | 4.36+   | Optimistic updates                    |
| Validation       | Zod            | 3.22+   | All new input schemas                 |
| Logging          | Pino           | 8.16+   | Structured logs for external APIs     |
| Monitoring       | Sentry         | 7.91+   | Error tracking for integrations       |

## New Technologies (Epic 4)

| Technology              | Version | Purpose                  | Cost                     | Integration Complexity |
| ----------------------- | ------- | ------------------------ | ------------------------ | ---------------------- |
| **Google Chat API**     | v1      | Webhook notifications    | Free                     | Low (REST webhooks)    |
| **Google Calendar API** | v3      | Scheduling, availability | Free (< 1M requests/day) | Medium (OAuth 2.0)     |
| **Gemini 1.5 Pro**      | Latest  | Meeting transcription    | ~$0.02/interview (audio) | Medium (async queue)   |

## Dependency Additions

```json
{
  "dependencies": {
    "googleapis": "^126.0.0",
    "@google-cloud/vertexai": "^1.1.0",
    "bullmq": "^4.12.0"
  },
  "devDependencies": {
    "@types/google.calendar": "^3.0.0"
  }
}
```

## Architecture Patterns

### 1. External API Integration Pattern (Adapter + Circuit Breaker)

**Problem**: Epic 4 introduces 3 external APIs (Google Chat, Google Calendar, Gemini) requiring consistent error handling and resilience.

**Pattern**: Adapter Pattern with Circuit Breaker

```typescript
// services/externalApiAdapter.ts
export abstract class ExternalApiAdapter<T> {
  protected circuitBreaker: CircuitBreaker;

  constructor(private config: AdapterConfig) {
    this.circuitBreaker = new CircuitBreaker({
      threshold: 5, // Open after 5 failures
      timeout: 30000, // 30s timeout
      resetTimeout: 60000, // Try again after 1min
    });
  }

  async execute(operation: () => Promise<T>): Promise<Result<T>> {
    try {
      const result = await this.circuitBreaker.execute(operation);
      logger.info({
        event: 'external_api_success',
        adapter: this.constructor.name,
      });
      return { success: true, data: result };
    } catch (error) {
      logger.error({
        event: 'external_api_failure',
        adapter: this.constructor.name,
        error,
      });
      return { success: false, error: this.mapError(error) };
    }
  }

  abstract mapError(error: unknown): AppError;
}

// services/googleChat.ts
export class GoogleChatAdapter extends ExternalApiAdapter<ChatResponse> {
  async sendNotification(
    webhookUrl: string,
    message: ChatMessage
  ): Promise<Result<void>> {
    return this.execute(async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });
  }

  mapError(error: unknown): AppError {
    return {
      code: 'GOOGLE_CHAT_FAILED',
      message: 'Failed to send notification',
      retryable: true,
    };
  }
}
```

**Why This Pattern**:

- **Consistency**: All external APIs use same error handling
- **Resilience**: Circuit breaker prevents cascade failures
- **Observability**: Centralized logging for all external calls
- **Fallback**: Adapters can implement graceful degradation (e.g., Chat fails → Email)

**Trade-offs**:

- ✅ Reduced duplication (one circuit breaker vs. three)
- ✅ Easy to add new APIs (extend base adapter)
- ⚠️ Slight abstraction overhead
- ❌ Rejected: Direct API calls (too brittle for production)

---

### 2. Service Layer Pattern (Domain-Driven Services)

**Problem**: Business logic for recruiter workflows (scheduling, timeline aggregation, notifications) shouldn't live in tRPC procedures.

**Pattern**: Domain Service Layer

```typescript
// services/recruiterNotificationService.ts
export class RecruiterNotificationService {
  constructor(
    private chatAdapter: GoogleChatAdapter,
    private emailService: EmailService
  ) {}

  async notifyNewApplication(
    subscription: RecruiterSubscription,
    application: Application
  ): Promise<void> {
    const message = this.buildApplicationMessage(application);

    // Try Google Chat first
    if (subscription.notificationChannels.googleChat) {
      const result = await this.chatAdapter.sendNotification(
        subscription.notificationChannels.googleChat.webhookUrl,
        message
      );
      if (result.success) return;
    }

    // Fallback to email
    await this.emailService.send({
      to: subscription.recruiterEmail,
      subject: `New Application: ${application.candidateName}`,
      body: this.formatEmailMessage(application),
    });
  }

  private buildApplicationMessage(app: Application): ChatMessage {
    return {
      text: `New application from ${app.candidateName}`,
      cards: [
        {
          header: { title: app.jobTitle },
          sections: [
            {
              widgets: [
                { textParagraph: { text: `Score: ${app.score}/100` } },
                {
                  buttons: [
                    {
                      textButton: {
                        text: 'View',
                        onClick: { openLink: { url: app.url } },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }
}

// services/timelineService.ts
export class TimelineService {
  async getFilteredTimeline(
    applicationId: string,
    role: UserRole
  ): Promise<TimelineEvent[]> {
    const application = await db.applications.findById(applicationId);

    // Role-based projection
    return application.timeline.filter(event => {
      if (event.visibility === 'both') return true;
      if (role === 'CANDIDATE' && event.visibility === 'candidate') return true;
      if (role === 'RECRUITER' && event.visibility === 'recruiter') return true;
      return false;
    });
  }

  async addEvent(
    applicationId: string,
    event: Omit<TimelineEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const newEvent: TimelineEvent = {
      ...event,
      id: uuid(),
      timestamp: new Date(),
    };

    await db.applications.updateOne(
      { _id: applicationId },
      { $push: { timeline: newEvent } }
    );

    // Trigger notification if applicable
    if (event.visibility === 'recruiter' || event.visibility === 'both') {
      await this.triggerNotification(applicationId, newEvent);
    }
  }
}
```

**Why This Pattern**:

- **Separation of Concerns**: tRPC procedures become thin controllers
- **Testability**: Services easily mocked in unit tests
- **Reusability**: `TimelineService` used by multiple routers
- **Domain Focus**: Business rules centralized (e.g., notification fallback logic)

**Trade-offs**:

- ✅ Easier to test complex workflows
- ✅ Clear ownership of business logic
- ⚠️ More files to navigate
- ❌ Rejected: Fat tRPC procedures (becomes unmaintainable)

---

### 3. Gemini Transcription Integration (Async Job Pattern)

**Problem**: Gemini audio transcription takes 30-60s. Blocking UX is unacceptable.

**Pattern**: Async Job Queue with Polling

```typescript
// services/gemini.ts
export class GeminiTranscriptionService {
  private queue: Queue<TranscriptionJob>;

  constructor(redisConnection: ConnectionOptions) {
    this.queue = new Queue('gemini-transcription', {
      connection: redisConnection,
    });
    this.startWorker();
  }

  async queueTranscription(callId: string, audioUrl: string): Promise<string> {
    const job = await this.queue.add(
      'transcribe',
      {
        callId,
        audioUrl,
        model: 'gemini-1.5-pro',
        timestamp: Date.now(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    // Update call record
    await db.scheduledCalls.updateOne(
      { _id: callId },
      {
        $set: {
          'geminiTranscript.jobId': job.id,
          'geminiTranscript.status': 'pending',
        },
      }
    );

    return job.id;
  }

  private startWorker(): void {
    const worker = new Worker(
      'gemini-transcription',
      async (job: Job<TranscriptionJob>) => {
        const { callId, audioUrl } = job.data;

        try {
          // Fetch audio from Azure Blob
          const audioBuffer = await fetchAudio(audioUrl);

          // Call Gemini API
          const response = await this.geminiClient.generateContent({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      data: audioBuffer.toString('base64'),
                      mimeType: 'audio/mp3',
                    },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2 },
          });

          const transcript = response.text();
          const summary = await this.summarizeTranscript(transcript);

          // Save results
          await db.scheduledCalls.updateOne(
            { _id: callId },
            {
              $set: {
                'geminiTranscript.status': 'completed',
                'geminiTranscript.transcript': transcript,
                'geminiTranscript.summary': summary,
              },
            }
          );

          logger.info({
            event: 'gemini_transcription_complete',
            callId,
            duration: Date.now() - job.data.timestamp,
          });
        } catch (error) {
          logger.error({ event: 'gemini_transcription_failed', callId, error });
          await db.scheduledCalls.updateOne(
            { _id: callId },
            { $set: { 'geminiTranscript.status': 'failed' } }
          );
          throw error; // Triggers retry
        }
      },
      { connection: redisConnection }
    );
  }
}

// tRPC procedure for polling
export const getTranscriptionStatus = protectedProcedure
  .input(z.object({ callId: z.string() }))
  .query(async ({ input }) => {
    const call = await db.scheduledCalls.findById(input.callId);
    return {
      status: call.geminiTranscript?.status || 'not_started',
      summary: call.geminiTranscript?.summary,
      transcript: call.geminiTranscript?.transcript,
    };
  });
```

**Why This Pattern**:

- **Non-Blocking**: User completes call immediately, transcription happens in background
- **Resilience**: BullMQ handles retries with exponential backoff
- **Cost Control**: Only process when call completes (not on every interview)
- **Scalability**: Redis queue can handle high volume

**Trade-offs**:

- ✅ No UX blocking (40% faster task completion per UX specs)
- ✅ Automatic retry logic
- ⚠️ Requires Redis infrastructure (Vercel KV supported)
- ❌ Rejected: Synchronous processing (violates inline-first UX principle)

---

### 4. Inline Actions State Management (Optimistic Updates)

**Problem**: UX specs require inline actions with instant feedback. Network latency breaks this.

**Pattern**: Optimistic Updates with Automatic Rollback

```typescript
// hooks/useInlineAction.ts
export function useInlineAction<T>(mutationFn: (data: T) => Promise<void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (data: T) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['applications']);

      // Snapshot current state
      const previousApplications = queryClient.getQueryData<Application[]>(['applications']);

      // Optimistically update UI
      queryClient.setQueryData<Application[]>(['applications'], (old) =>
        old?.map(app => app.id === data.applicationId ? { ...app, ...data } : app)
      );

      return { previousApplications };
    },
    onError: (error, data, context) => {
      // Rollback on failure
      queryClient.setQueryData(['applications'], context?.previousApplications);
      toast.error('Action failed. Please try again.');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['applications']);
    },
  });
}

// Usage in component
function InlineActions({ application }: Props) {
  const addFeedback = useInlineAction(api.recruiter.addFeedback.mutate);

  const handleQuickFeedback = (rating: number) => {
    addFeedback.mutate({ applicationId: application.id, rating, notes: '' });
    // UI updates instantly, rolls back if fails
  };

  return (
    <Stack direction="row" spacing={1}>
      {[1, 2, 3, 4, 5].map(rating => (
        <IconButton key={rating} onClick={() => handleQuickFeedback(rating)}>
          <Star />
        </IconButton>
      ))}
    </Stack>
  );
}
```

**Why This Pattern**:

- **Instant Feedback**: UI updates before server responds (meets 40% faster completion goal)
- **Automatic Rollback**: No manual error state management
- **Consistency**: `onSettled` refetch ensures eventual consistency

**Trade-offs**:

- ✅ Perceived performance boost
- ✅ Reduces cognitive load (user doesn't wait for confirmation)
- ⚠️ Requires careful cache key management
- ❌ Rejected: Server-first updates (conflicts with inline-first UX goals)

---

### 5. Timeline Event Filtering (Role-Based View Projection)

**Problem**: Candidates and recruiters see different timeline events. Sending all events to client is security risk.

**Pattern**: Server-Side Projection with Field-Level Visibility

```typescript
// services/timeline.ts
export class TimelineService {
  async getTimelineForRole(
    applicationId: string,
    role: UserRole
  ): Promise<TimelineEvent[]> {
    const application = await db.applications.findById(applicationId);

    // Project events based on visibility rules
    const filteredEvents = application.timeline.filter(event => {
      // Public events visible to all
      if (event.visibility === 'both') return true;

      // Role-specific visibility
      if (role === 'CANDIDATE' && event.visibility === 'candidate') return true;
      if (role === 'RECRUITER' && event.visibility === 'recruiter') return true;

      // Admin sees everything
      if (role === 'ADMIN') return true;

      return false;
    });

    // Sanitize event data (remove internal fields)
    return filteredEvents.map(event => ({
      ...event,
      data: this.sanitizeEventData(event, role),
    }));
  }

  private sanitizeEventData(
    event: TimelineEvent,
    role: UserRole
  ): Record<string, any> {
    // Remove recruiter-only fields from candidate view
    if (role === 'CANDIDATE') {
      const { internalNotes, recruiterScore, ...publicData } = event.data;
      return publicData;
    }
    return event.data;
  }
}

// tRPC procedure
export const getTimeline = protectedProcedure
  .input(z.object({ applicationId: z.string() }))
  .query(async ({ ctx, input }) => {
    const timelineService = new TimelineService();
    return timelineService.getTimelineForRole(
      input.applicationId,
      ctx.session.user.role
    );
  });
```

**Why This Pattern**:

- **Security**: No sensitive data leaks to client (filtered server-side)
- **Single Source of Truth**: One timeline array with visibility metadata
- **Performance**: No client-side filtering logic needed

**Trade-offs**:

- ✅ Prevents accidental data leaks
- ✅ Easier to audit compliance (GDPR, data access)
- ⚠️ Requires careful visibility field management when adding events
- ❌ Rejected: Dual timeline collections (data duplication, sync complexity)
- ❌ Rejected: Client-side filtering (security risk)

---
