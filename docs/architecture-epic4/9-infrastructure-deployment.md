# 9. Infrastructure & Deployment

## Environment Variables (New)

```env
# Google APIs
GOOGLE_CHAT_ENABLED=true
GOOGLE_CALENDAR_CLIENT_ID=xxx
GOOGLE_CALENDAR_CLIENT_SECRET=xxx
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Gemini
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-1.5-pro

# Job Queue
REDIS_URL=redis://localhost:6379 # for BullMQ
```

## Vercel Deployment Changes

- **Serverless Functions**: All new tRPC routes auto-deploy
- **Edge Config**: Store rate limits for Google API quotas
- **Cron Jobs**: `/api/cron/sync-calendars` (hourly)
- **Background Jobs**: Use Vercel KV + BullMQ for Gemini transcription queue

---
