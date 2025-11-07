# 2. Enhancement Scope & Integration Strategy

## Epic 4 Stories (9 Total)

1. **4.1**: Recruiter Dashboard with Metrics
2. **4.2**: Google Chat Webhook Integration
3. **4.3**: AI-Powered Candidate Suggestions (Vector Search)
4. **4.4**: Dual-Perspective Application Timeline
5. **4.5**: Profile Sharing with Signed URLs
6. **4.6**: Multi-Stage Workflow Automation
7. **4.7**: Call Scheduling with Google Calendar
8. **4.8**: Gemini Meeting Transcription
9. **4.9**: UX Refresh (Inline-First Approach)

## Integration Philosophy

**Brownfield Approach**: Extend existing architecture vs. greenfield rebuild.

**Key Decisions**:

- **Extend** `applications` collection with `timeline` field (avoid new collection)
- **New** `recruiterRouter` in tRPC (separate from candidate/auth routers)
- **Reuse** OpenAI vector search for candidate suggestions (no new embedding model)
- **Async** Gemini transcription via job queue (non-blocking UX)
- **Role-based projection** for timeline events (single source of truth)

## Data Flow Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Recruiter  │─────▶│ Next.js API  │─────▶│  MongoDB    │
│  Dashboard  │◀─────│   (tRPC)     │◀─────│  Atlas      │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     ├──────────▶ Google Chat API
       │                     ├──────────▶ Google Calendar API
       │                     └──────────▶ Gemini API (async)
       │
       └──────────▶ Material-UI Components (Inline-First)
```

---
