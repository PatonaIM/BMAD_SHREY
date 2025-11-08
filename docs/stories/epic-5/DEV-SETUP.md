# Development Setup - Epic 5 Stage-Based Model

## 🚀 Quick Start (Development Environment)

Since we're in active development, we're **dropping the applications collection** and recreating it with the new stage-based schema.

**Note:** Other collections (users, jobs, etc.) will be preserved.

### Step 1: Reset Applications Collection

**⚠️ WARNING: This will delete all existing applications!**

```bash
npm run dev:reset-db
```

This script will:

1. Drop the `applications` collection (preserves other collections)
2. Recreate it with the new stage-based indexes
3. Prepare it for the new schema

### Step 2: Start Your Development Server

```bash
npm run dev
```

### Step 3: Test with New Applications

Create test applications that will automatically use the new stage-based model:

1. **Candidate Flow:**
   - Create new application (will create `submit_application` stage)
   - Complete AI interview (will add `ai_interview` stage)
   - Submit assignment (will add `assignment` stage)
   - Book interview slot (will add `live_interview` stage)
   - Accept offer (will add `offer` and `offer_accepted` stages)

2. **Recruiter Flow:**
   - View candidate applications with stage timeline
   - Send assignments (creates new `assignment` stage)
   - Schedule interviews (creates new `live_interview` stage)
   - Send offers (creates new `offer` stage)
   - Disqualify candidates (creates `disqualified` stage)

---

## 📋 New Schema Overview

### Before (Old Model)

```typescript
{
  _id: ObjectId,
  userId: "user123",
  jobId: "job456",
  status: "ai_interview",  // Single status field
  timeline: [...],         // Append-only events
  createdAt: Date,
  updatedAt: Date
}
```

### After (New Model)

```typescript
{
  _id: ObjectId,
  userId: "user123",
  jobId: "job456",
  stages: [                // Dynamic array
    {
      id: "stage_1",
      type: "submit_application",
      status: "completed",
      order: 0,
      data: { submittedAt: Date, resumeUrl: "..." },
      ...
    },
    {
      id: "stage_2",
      type: "ai_interview",
      status: "in_progress",
      order: 1,
      data: { interviewSessionId: "..." },
      ...
    }
  ],
  currentStageId: "stage_2",
  isDisqualified: false,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛠️ Available Scripts

### Development

```bash
npm run dev:reset-db          # Drop applications collection and recreate with indexes
npm run dev                   # Start dev server
```

### Database Management

```bash
npm run indexes:create        # Create all stage indexes
npm run indexes:list          # List existing indexes
npm run indexes:drop          # Drop stage indexes
npm run indexes:analyze       # Analyze index performance
```

### Migration (Future Production Use)

```bash
npm run migration:stages:dry-run    # Test migration (read-only)
npm run migration:stages:execute    # Run migration
npm run migration:stages:rollback   # Rollback migration
```

---

## 🧪 Testing New Features

### Test Stage Transitions

1. **Create Application**

   ```typescript
   // Should create stages array with submit_application stage
   const app = await createApplication({
     userId: 'test_user',
     jobId: 'test_job',
   });

   expect(app.stages).toHaveLength(1);
   expect(app.stages[0].type).toBe('submit_application');
   expect(app.currentStageId).toBe(app.stages[0].id);
   ```

2. **Add Stage**

   ```typescript
   // Add AI interview stage
   const newStage = createStage(
     'ai_interview',
     {
       type: 'ai_interview',
       interviewSessionId: 'session_123',
     },
     { order: 1 }
   );

   app.stages.push(newStage);
   app.currentStageId = newStage.id;
   ```

3. **Validate Transitions**

   ```typescript
   // Check if transition is allowed
   const validation = validateStageTransition(currentStage, 'live_interview');

   if (!validation.valid) {
     console.error(validation.errors);
   }
   ```

### Test Role-Based Views

```typescript
// Candidate view (only visible stages)
const candidateStages = getVisibleStages(app.stages, 'candidate');

// Recruiter view (all stages)
const recruiterStages = getVisibleStages(app.stages, 'recruiter');
```

### Test Progress Calculation

```typescript
const progress = calculateProgress(app.stages);
// Returns: 50 (if 2 out of 4 stages completed)

const stats = getStageStatistics(app.stages);
// Returns: { total: 4, completed: 2, pending: 1, inProgress: 1, ... }
```

---

## 📊 Database Indexes

After running `npm run dev:reset-db`, these indexes will be created:

1. **stages.type** - Query by stage type
2. **stages.status** - Query by stage status
3. **stages.order** - Sort stages
4. **currentStageId** - Find current stage
5. **isDisqualified** - Filter active/disqualified apps
6. **userId + isDisqualified** - User's active apps
7. **jobId + stages.status** - Job pipeline view
8. **jobId + currentStageId** - Pipeline by current stage
9. **stages.data.scheduledTime** - Upcoming interviews
10. **stages.data.sentAt** - Assignment tracking
11. **updatedAt + isDisqualified** - Recent active apps

Verify indexes:

```bash
npm run indexes:list
```

---

## 🔍 Troubleshooting

### Database Connection Error

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Or if using Docker
docker ps | grep mongo
```

### Reset Script Fails

```bash
# Check environment variables
echo $MONGODB_URI
echo $MONGODB_DB

# Default values:
# MONGODB_URI=mongodb://localhost:27017
# MONGODB_DB=teammatch
```

### Need to Preserve Other Data?

The script only drops the `applications` collection. Your users, jobs, and other collections are safe!

### Need Fresh Start

```bash
# Stop everything
npm run dev:reset-db

# Clear node cache (if needed)
rm -rf node_modules/.cache

# Restart
npm run dev
```

---

## 📝 Notes for Production Migration

While we're dropping the DB in development, the migration scripts in `/scripts/migrations/` are preserved for **future production use** when this feature is deployed.

**Migration scripts include:**

- Full data migration from old to new schema
- Rollback capability
- Dry-run mode for testing
- Comprehensive documentation

These will be used when deploying to staging/production environments where data must be preserved.

---

## ✅ Checklist

Before starting feature development:

- [ ] Run `npm run dev:reset-db` successfully
- [ ] Verify indexes created: `npm run indexes:list`
- [ ] Start dev server: `npm run dev`
- [ ] Create a test application in UI
- [ ] Verify stages array in MongoDB
- [ ] Check timeline renders correctly
- [ ] Test stage transitions work

---

**Last Updated:** November 8, 2025  
**Epic:** 5 - Dynamic Multi-Stage Application Timeline  
**Environment:** Development Only
