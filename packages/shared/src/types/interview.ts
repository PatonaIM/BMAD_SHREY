export interface InterviewSession {
  _id: string;
  userId: string;
  jobId: string;
  startedAt: string;
  endedAt?: string;
  transcript?: string;
  score?: number;
}
