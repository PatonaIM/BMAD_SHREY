# 8. Source Tree Changes

```
src/
├── app/
│   ├── recruiter/                    # NEW - Recruiter dashboard pages
│   │   ├── page.tsx                  # Dashboard landing
│   │   ├── jobs/[id]/page.tsx        # Job-specific view
│   │   └── settings/page.tsx         # Chat/Calendar setup
│   └── api/
│       └── webhooks/
│           └── google-chat/route.ts  # NEW - Webhook handler
├── services/
│   ├── googleChat.ts                 # NEW
│   ├── googleCalendar.ts             # NEW
│   ├── gemini.ts                     # NEW
│   └── timeline.ts                   # NEW - Timeline aggregation
├── components/recruiter/             # NEW - see Section 5
└── data-access/
    ├── recruiterSubscriptions.ts     # NEW
    ├── googleChatWebhooks.ts         # NEW
    ├── interviewFeedback.ts          # NEW
    ├── availabilitySlots.ts          # NEW
    └── scheduledCalls.ts             # NEW
```

---
