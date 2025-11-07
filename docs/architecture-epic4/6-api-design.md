# 6. API Design

## New tRPC Router: `recruiterRouter`

```typescript
export const recruiterRouter = router({
  // Dashboard
  getDashboard: protectedProcedure
    .input(z.object({ jobId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Aggregate metrics, recent applications
    }),

  // Subscriptions
  createSubscription: protectedProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      // Create subscription with Google Chat webhook
    }),

  // Timeline
  getTimeline: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Role-based projection
      const events = await getTimelineEvents(input.applicationId);
      return filterByRole(events, ctx.session.user.role);
    }),

  // Feedback
  addFeedback: protectedProcedure
    .input(feedbackSchema)
    .mutation(async ({ ctx, input }) => {
      // Store feedback + emit timeline event
    }),

  // Scheduling
  getAvailability: protectedProcedure
    .input(z.object({ recruiterId: z.string(), startDate: z.date() }))
    .query(async ({ ctx, input }) => {
      // Fetch from availabilitySlots + Google Calendar sync
    }),

  scheduleCall: protectedProcedure
    .input(scheduleCallSchema)
    .mutation(async ({ ctx, input }) => {
      // Book slot + create Google Calendar event + trigger Gemini job
    }),

  // Profile Sharing
  shareProfile: protectedProcedure
    .input(z.object({ applicationId: z.string(), expiresIn: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Generate signed URL with expiry
    }),

  // Suggestions
  getSuggestedCandidates: protectedProcedure
    .input(z.object({ jobId: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      // Vector search + scoring logic
    }),
});
```

---
