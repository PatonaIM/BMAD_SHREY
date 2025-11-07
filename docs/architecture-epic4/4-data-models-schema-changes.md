# 4. Data Models & Schema Changes

## New MongoDB Collections

```typescript
// 1. recruiterSubscriptions
interface RecruiterSubscription {
  _id: ObjectId;
  recruiterId: ObjectId; // ref: users
  jobId: ObjectId; // ref: jobs
  notificationChannels: {
    email: boolean;
    googleChat?: { webhookUrl: string; spaceId: string };
  };
  filters: {
    minScore?: number;
    stages?: ApplicationStage[];
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// 2. googleChatWebhooks
interface GoogleChatWebhook {
  _id: ObjectId;
  recruiterId: ObjectId;
  spaceId: string; // Google Chat space identifier
  webhookUrl: string; // encrypted
  displayName: string;
  verified: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

// 3. interviewFeedback
interface InterviewFeedback {
  _id: ObjectId;
  applicationId: ObjectId;
  sessionId: string; // ref: interviewSessions
  recruiterId: ObjectId;
  rating: number; // 1-5
  notes: string;
  tags: string[]; // "strong-fit", "needs-training", etc.
  visibility: 'internal' | 'shared-with-candidate';
  createdAt: Date;
}

// 4. availabilitySlots
interface AvailabilitySlot {
  _id: ObjectId;
  recruiterId: ObjectId;
  startTime: Date;
  endTime: Date;
  calendarEventId?: string; // Google Calendar sync
  status: 'available' | 'booked' | 'blocked';
  bookingId?: ObjectId; // ref: scheduledCalls
  timezone: string;
  createdAt: Date;
}

// 5. scheduledCalls
interface ScheduledCall {
  _id: ObjectId;
  applicationId: ObjectId;
  candidateId: ObjectId;
  recruiterId: ObjectId;
  slotId: ObjectId; // ref: availabilitySlots
  meetingLink: string;
  calendarEventId: string; // Google Calendar
  status: 'scheduled' | 'completed' | 'cancelled';
  geminiTranscript?: {
    jobId: string; // async processing
    status: 'pending' | 'processing' | 'completed' | 'failed';
    blobUrl?: string;
    summary?: string;
  };
  createdAt: Date;
  completedAt?: Date;
}
```

## Schema Extensions (Existing Collections)

```typescript
// applications collection - add timeline events
interface Application {
  // ... existing fields
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  eventType:
    | 'status_change'
    | 'interview_completed'
    | 'feedback_added'
    | 'call_scheduled'
    | 'profile_shared'
    | 'score_updated';
  actor: { role: 'candidate' | 'recruiter' | 'system'; id: ObjectId };
  data: Record<string, any>; // flexible event payload
  visibility: 'candidate' | 'recruiter' | 'both';
}

// users collection - add recruiter metadata
interface User {
  // ... existing fields
  recruiterMetadata?: {
    company: string;
    calendarConnected: boolean;
    defaultAvailabilityHours: { start: string; end: string; days: number[] };
    chatWebhookId?: ObjectId;
  };
}
```

## Indexes

```typescript
// Performance-critical indexes
db.recruiterSubscriptions.createIndex(
  { recruiterId: 1, jobId: 1 },
  { unique: true }
);
db.googleChatWebhooks.createIndex({ recruiterId: 1 });
db.interviewFeedback.createIndex({ applicationId: 1 });
db.availabilitySlots.createIndex({ recruiterId: 1, startTime: 1 });
db.scheduledCalls.createIndex({ applicationId: 1 });
db.scheduledCalls.createIndex({ 'geminiTranscript.status': 1 }); // job queue
db.applications.createIndex({ 'timeline.timestamp': -1 });
```

---
