# Summary of Architectural Decisions

| Pattern                   | Primary Goal               | Rejected Alternative   | Reason for Rejection           |
| ------------------------- | -------------------------- | ---------------------- | ------------------------------ |
| Adapter + Circuit Breaker | External API resilience    | Direct API calls       | Too brittle for production     |
| Domain Service Layer      | Business logic isolation   | Fat tRPC procedures    | Unmaintainable at scale        |
| Async Job Queue           | Non-blocking transcription | Synchronous processing | Violates inline-first UX       |
| Optimistic Updates        | Instant feedback           | Server-first updates   | Conflicts with 40% faster goal |
| Role-Based Projection     | Security                   | Client-side filtering  | Data leak risk                 |

---
