# Migration Scripts - Epic 5: Stage-Based Application Timeline

This directory contains migration scripts for transitioning from the legacy single-status application model to the new dynamic multi-stage timeline system.

---

## 📋 Overview

### Purpose

Migrate existing applications from:

```typescript
// OLD MODEL
{
  status: 'ai_interview',  // Single status
  timeline: [...]          // Append-only events
}
```

To:

```typescript
// NEW MODEL
{
  stages: [                // Dynamic array of stages
    { type: 'submit_application', status: 'completed', ... },
    { type: 'ai_interview', status: 'in_progress', ... }
  ],
  currentStageId: 'stage_xyz',
  isDisqualified: false
}
```

### Files

1. **`migrate-to-stages.ts`** - Main migration script
   - Converts status to stages array
   - Creates stage-specific data
   - Updates all applications in batches
   - Includes rollback capability

2. **`create-stage-indexes.ts`** - MongoDB index management
   - Creates 11 indexes for optimal query performance
   - Lists existing indexes
   - Drops indexes for cleanup
   - Analyzes index usage and performance

---

## 🚀 Quick Start

### Prerequisites

1. **Backup your database** (CRITICAL!)

```bash
mongodump --uri="mongodb://localhost:27017/teammatch" --out=backup-$(date +%Y%m%d)
```

2. **Set environment variables**

```bash
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB="teammatch"
```

3. **Install dependencies**

```bash
npm install
```

### Step-by-Step Migration

#### Step 1: Dry Run (Test Migration)

```bash
npm run migration:stages:dry-run
```

This will:

- ✓ Connect to MongoDB (read-only)
- ✓ Simulate migration for all applications
- ✓ Show what would be changed
- ✓ Report any errors
- ✗ NOT modify any data

**Review the output carefully!** Look for:

- Total applications to migrate
- Any error messages
- Expected stage configurations

#### Step 2: Create Indexes (Staging Environment First!)

```bash
npm run indexes:create
```

Creates 11 indexes:

- `stages.type` - Query by stage type
- `stages.status` - Query by stage status
- `stages.order` - Sort stages
- `currentStageId` - Find current stage
- `isDisqualified` - Filter active/disqualified
- 6 compound indexes for common queries

**Time estimate:** ~30 seconds for 100K documents

#### Step 3: Execute Migration

```bash
npm run migration:stages:execute
```

This will:

- ✓ Migrate all applications in batches (100 per batch)
- ✓ Show progress percentage
- ✓ Log each migrated application
- ✓ Report final statistics

**Time estimate:**

- 1,000 apps: ~10 seconds
- 10,000 apps: ~1-2 minutes
- 100,000 apps: ~10-15 minutes

**Monitor the output for:**

- "✓ Migrated" - Success
- "⊘ Skipped" - Already migrated
- "✗ Failed" - Check error message

#### Step 4: Verify Migration

```bash
# Check a few applications manually
mongosh teammatch --eval "db.applications.findOne({stages: {\$exists: true}})"

# Analyze index usage
npm run indexes:analyze
```

**Validation checklist:**

- [ ] All applications have `stages` array
- [ ] All applications have `currentStageId`
- [ ] All applications have `isDisqualified` boolean
- [ ] No data loss (old fields still present)
- [ ] Stage order is correct (0, 1, 2, ...)
- [ ] Stage statuses are valid

#### Step 5: Test Application (Critical!)

```bash
npm run dev
```

**Test these flows:**

1. View application timeline (candidate view)
2. View application timeline (recruiter view)
3. Upload assignment
4. Schedule interview
5. Send offer
6. Disqualify candidate

**If issues arise, proceed to Step 6 immediately!**

---

## 🔄 Rollback (Emergency)

If you encounter critical issues:

```bash
npm run migration:stages:rollback
```

This will:

- Remove `stages` field
- Remove `currentStageId` field
- Remove `isDisqualified` field
- Remove `migratedAt` timestamp
- Restore original `status` field (was preserved)

**Rollback time:** ~30 seconds for 100K documents

**After rollback:**

1. Application returns to old model
2. All data is preserved
3. Investigate migration errors
4. Fix issues and retry

---

## 📊 Index Management

### Create Indexes

```bash
npm run indexes:create
```

### List Existing Indexes

```bash
npm run indexes:list
```

Output:

```
1. _id_
   Keys: {"_id": 1}

2. stages_type_idx
   Keys: {"stages.type": 1}
   Background: true

... (all indexes)
```

### Analyze Index Performance

```bash
npm run indexes:analyze
```

Shows:

- Collection size and document count
- Index size
- Query performance tests
- Recommendations

### Drop Stage Indexes (Cleanup)

```bash
npm run indexes:drop
```

Use this:

- Before re-running migration on staging
- To clean up after testing
- When reverting to old model

---

## 🧪 Testing Strategy

### Local Testing

1. Use Docker MongoDB container

```bash
docker run -d -p 27017:27017 --name mongo-test mongo:7
```

2. Seed with test data

```bash
# Import test applications
mongoimport --db teammatch --collection applications --file test-data.json
```

3. Run dry-run

```bash
npm run migration:stages:dry-run
```

4. Execute migration

```bash
npm run migration:stages:execute
```

5. Verify results

```bash
npm run indexes:analyze
```

### Staging Testing

1. **Create full database backup**

```bash
mongodump --uri="$STAGING_MONGODB_URI" --out=staging-backup
```

2. **Run dry-run** (safe, read-only)

```bash
MONGODB_URI=$STAGING_MONGODB_URI npm run migration:stages:dry-run
```

3. **Create indexes first**

```bash
MONGODB_URI=$STAGING_MONGODB_URI npm run indexes:create
```

4. **Execute migration**

```bash
MONGODB_URI=$STAGING_MONGODB_URI npm run migration:stages:execute
```

5. **Full QA testing** (all user flows)

6. **Performance testing** (load tests)

7. **Rollback test** (verify rollback works)

```bash
MONGODB_URI=$STAGING_MONGODB_URI npm run migration:stages:rollback
```

### Production Migration (Week 9)

**Pre-migration checklist:**

- [ ] Full database backup completed
- [ ] Staging migration successful
- [ ] QA sign-off received
- [ ] Rollback tested on staging
- [ ] Maintenance window scheduled
- [ ] Team on standby
- [ ] Monitoring alerts configured

**Migration steps:**

1. Enable maintenance mode
2. Backup production database
3. Run dry-run (verify)
4. Create indexes (10-30 seconds)
5. Execute migration (monitor carefully)
6. Verify sample applications
7. Enable new UI (feature flag)
8. Monitor metrics for 1 hour
9. Disable maintenance mode

**Post-migration monitoring:**

- API response times (<100ms)
- Error rates (<0.1%)
- User reports
- Database query performance

---

## 🔍 Troubleshooting

### Error: "Cannot find module 'mongodb'"

```bash
npm install mongodb
```

### Error: "Connection refused"

Check MongoDB is running:

```bash
# Local
brew services list | grep mongodb

# Docker
docker ps | grep mongo
```

### Error: "Unauthorized"

Check MongoDB credentials:

```bash
echo $MONGODB_URI
```

### Error: "Duplicate key error"

An application was partially migrated. Rollback and retry:

```bash
npm run migration:stages:rollback
npm run migration:stages:execute
```

### Migration is slow

- Check batch size (default 100)
- Ensure indexes are created first
- Check network latency to DB
- Consider running during low-traffic hours

### Disk space warning

Indexes require additional space (~10-20% of collection size):

```bash
# Check available space
df -h

# Check MongoDB disk usage
mongosh --eval "db.stats(1024*1024)" | grep dataSize
```

---

## 📈 Performance Expectations

### Migration Time (estimates)

| Applications | Time       | Throughput   |
| ------------ | ---------- | ------------ |
| 100          | < 5 sec    | ~20/sec      |
| 1,000        | ~10 sec    | ~100/sec     |
| 10,000       | ~1-2 min   | ~100-150/sec |
| 100,000      | ~10-15 min | ~100-150/sec |
| 1,000,000    | ~2-3 hours | ~100-150/sec |

### Index Creation Time

| Applications | Time    |
| ------------ | ------- |
| 1,000        | ~1 sec  |
| 10,000       | ~5 sec  |
| 100,000      | ~30 sec |
| 1,000,000    | ~5 min  |

### Query Performance (after indexes)

| Query Type          | Before | After |
| ------------------- | ------ | ----- |
| Find by stage type  | 200ms  | <10ms |
| Active applications | 150ms  | <5ms  |
| User's applications | 100ms  | <5ms  |
| Job pipeline view   | 500ms  | <20ms |

---

## 🔐 Security Considerations

### Database Access

- Use read-only credentials for dry-run
- Use admin credentials for execute/rollback
- Rotate credentials after migration

### Backup Retention

- Keep backups for 30 days
- Store backups in secure location (encrypted)
- Test backup restoration monthly

### Audit Trail

Migration script logs:

- Timestamp
- Command (dry-run/execute/rollback)
- User/environment
- Results (success/failure counts)
- Errors

---

## 📞 Support

### Questions?

- **Slack**: `#epic5-dynamic-timeline`
- **Backend Lead**: backend@company.com
- **DevOps**: devops@company.com

### Production Issues?

1. Check `#incidents` Slack channel
2. Page on-call engineer (PagerDuty)
3. Consider immediate rollback if critical

---

## ✅ Success Criteria

Migration is successful when:

- [x] Zero data loss
- [x] All applications migrated
- [x] All indexes created
- [x] Query performance meets SLA (<100ms p95)
- [x] No increase in error rate
- [x] UI renders correctly for all stage types
- [x] User acceptance testing passes
- [x] Production monitoring shows green

---

**Last Updated:** November 8, 2025  
**Epic:** 5 - Dynamic Multi-Stage Application Timeline  
**Sprint:** 1 (Weeks 1-2)
