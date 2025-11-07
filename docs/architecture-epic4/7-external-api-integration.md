# 7. External API Integration

## Google Chat API (Webhook Pattern)

```typescript
// services/googleChat.ts
export class GoogleChatAdapter {
  async sendNotification(
    webhookUrl: string,
    message: ChatMessage
  ): Promise<void> {
    const payload = {
      text: message.text,
      cards: message.cards,
    };

    await this.circuitBreaker.execute(async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Google Chat webhook failed');
    });
  }

  async verifyWebhook(url: string): Promise<boolean> {
    // Send test message
    try {
      await this.sendNotification(url, { text: 'TeamMatch verification' });
      return true;
    } catch {
      return false;
    }
  }
}
```

## Google Calendar API (OAuth 2.0)

```typescript
// services/googleCalendar.ts
export class GoogleCalendarService {
  async createEvent(
    recruiterId: string,
    event: CalendarEvent
  ): Promise<string> {
    const auth = await this.getOAuthClient(recruiterId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        start: { dateTime: event.startTime.toISOString() },
        end: { dateTime: event.endTime.toISOString() },
        attendees: event.attendees.map(email => ({ email })),
        conferenceData: { createRequest: { requestId: uuid() } },
      },
      conferenceDataVersion: 1,
    });

    return response.data.id!;
  }

  async syncAvailability(recruiterId: string): Promise<void> {
    // Fetch freebusy, update availabilitySlots
  }
}
```

## Gemini API (Async Transcription)

```typescript
// services/gemini.ts
export class GeminiTranscriptionService {
  async queueTranscription(callId: string, audioUrl: string): Promise<string> {
    const job = await this.jobQueue.add('transcribe', {
      callId,
      audioUrl,
      model: 'gemini-1.5-pro',
    });
    return job.id;
  }

  async processTranscription(jobId: string): Promise<void> {
    const job = await this.jobQueue.getJob(jobId);
    const { callId, audioUrl } = job.data;

    const audio = await fetchAudio(audioUrl);
    const response = await this.geminiClient.generateContent({
      contents: [
        { parts: [{ inlineData: { data: audio, mimeType: 'audio/mp3' } }] },
      ],
      generationConfig: { temperature: 0.2 },
    });

    const transcript = response.text();
    const summary = await this.summarize(transcript);

    await db.scheduledCalls.updateOne(
      { _id: callId },
      {
        $set: {
          'geminiTranscript.status': 'completed',
          'geminiTranscript.summary': summary,
        },
      }
    );
  }
}
```

---
