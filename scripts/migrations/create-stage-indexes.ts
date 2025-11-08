/**
 * Create MongoDB Indexes for Stage-Based Application Model
 *
 * This script creates all necessary indexes for efficient querying
 * of the new stage-based application timeline system (Epic 5).
 *
 * Usage:
 *   npm run indexes:create    # Create all indexes
 *   npm run indexes:list      # List existing indexes
 *   npm run indexes:drop      # Drop stage-related indexes
 *
 * @module create-stage-indexes
 */

import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface IndexConfig {
  mongoUri: string;
  dbName: string;
  dryRun: boolean;
}

/**
 * Create all stage-related indexes
 */
async function createStageIndexes(db: Db, dryRun: boolean): Promise<void> {
  const applications = db.collection('applications');

  console.log(
    dryRun
      ? '\n[DRY RUN] Would create the following indexes:\n'
      : '\nCreating indexes for stage-based queries...\n'
  );

  const indexes = [
    {
      keys: { 'stages.type': 1 },
      options: { name: 'stages_type_idx', background: true },
      description:
        'Query applications by stage type (e.g., all with assignments)',
    },
    {
      keys: { 'stages.status': 1 },
      options: { name: 'stages_status_idx', background: true },
      description: 'Query applications by stage status (e.g., in_progress)',
    },
    {
      keys: { 'stages.order': 1 },
      options: { name: 'stages_order_idx', background: true },
      description: 'Sort stages within an application by order',
    },
    {
      keys: { currentStageId: 1 },
      options: { name: 'current_stage_id_idx', background: true },
      description: 'Quickly find current stage for an application',
    },
    {
      keys: { isDisqualified: 1 },
      options: { name: 'is_disqualified_idx', background: true },
      description: 'Filter active vs disqualified applications',
    },
    {
      keys: { userId: 1, isDisqualified: 1 },
      options: { name: 'user_disqualified_compound_idx', background: true },
      description: 'Get all active applications for a candidate',
    },
    {
      keys: { jobId: 1, 'stages.status': 1 },
      options: { name: 'job_stage_status_compound_idx', background: true },
      description: 'Recruiter view: all applications for job grouped by stage',
    },
    {
      keys: { jobId: 1, currentStageId: 1 },
      options: { name: 'job_current_stage_compound_idx', background: true },
      description: 'Pipeline view: applications at each stage for a job',
    },
    {
      keys: { 'stages.data.scheduledTime': 1 },
      options: {
        name: 'interview_scheduled_time_idx',
        background: true,
        sparse: true,
      },
      description: 'Find upcoming interviews',
    },
    {
      keys: { 'stages.data.sentAt': 1 },
      options: {
        name: 'assignment_sent_at_idx',
        background: true,
        sparse: true,
      },
      description: 'Track assignment response times',
    },
    {
      keys: { updatedAt: -1, isDisqualified: 1 },
      options: { name: 'updated_active_apps_idx', background: true },
      description: 'Most recently updated active applications',
    },
  ];

  for (const index of indexes) {
    try {
      if (dryRun) {
        console.log(`  ${index.options.name}`);
        console.log(`    Keys: ${JSON.stringify(index.keys)}`);
        console.log(`    Purpose: ${index.description}\n`);
      } else {
        await applications.createIndex(index.keys as any, index.options);
        console.log(`✓ Created: ${index.options.name}`);
        console.log(`  ${index.description}\n`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to create ${index.options.name}: ${errorMsg}\n`);
    }
  }

  if (dryRun) {
    console.log(`Total indexes to create: ${indexes.length}\n`);
  } else {
    console.log('✅ All indexes created successfully!\n');
  }
}

/**
 * List existing indexes
 */
async function listIndexes(db: Db): Promise<void> {
  const applications = db.collection('applications');
  const indexes = await applications.indexes();

  console.log('\nExisting indexes on applications collection:\n');
  console.log('='.repeat(80));

  indexes.forEach((index, i) => {
    console.log(`${i + 1}. ${index.name}`);
    console.log(`   Keys: ${JSON.stringify(index.key)}`);
    if (index.background) console.log(`   Background: true`);
    if (index.sparse) console.log(`   Sparse: true`);
    if (index.unique) console.log(`   Unique: true`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Total: ${indexes.length} indexes\n`);
}

/**
 * Drop stage-related indexes (for cleanup/testing)
 */
async function dropStageIndexes(db: Db, dryRun: boolean): Promise<void> {
  const applications = db.collection('applications');

  const stageIndexNames = [
    'stages_type_idx',
    'stages_status_idx',
    'stages_order_idx',
    'current_stage_id_idx',
    'is_disqualified_idx',
    'user_disqualified_compound_idx',
    'job_stage_status_compound_idx',
    'job_current_stage_compound_idx',
    'interview_scheduled_time_idx',
    'assignment_sent_at_idx',
    'updated_active_apps_idx',
  ];

  console.log(
    dryRun
      ? '\n[DRY RUN] Would drop the following indexes:\n'
      : '\nDropping stage-related indexes...\n'
  );

  for (const indexName of stageIndexNames) {
    try {
      if (dryRun) {
        console.log(`  - ${indexName}`);
      } else {
        await applications.dropIndex(indexName);
        console.log(`✓ Dropped: ${indexName}`);
      }
    } catch {
      // Index might not exist, that's okay
      if (dryRun) {
        console.log(`  - ${indexName} (doesn't exist)`);
      } else {
        console.log(`  Skipped: ${indexName} (doesn't exist)`);
      }
    }
  }

  console.log('');
}

/**
 * Get index statistics and recommendations
 */
async function analyzeIndexes(db: Db): Promise<void> {
  const applications = db.collection('applications');

  console.log('\nAnalyzing index usage...\n');
  console.log('='.repeat(80));

  try {
    // Get collection stats
    const stats = await db.command({ collStats: 'applications' });
    console.log(`Collection: applications`);
    console.log(`  Documents: ${stats.count.toLocaleString()}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Indexes: ${stats.nindexes}`);
    console.log(
      `  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB\n`
    );

    // Check if indexes exist
    const indexes = await applications.indexes();
    const stageIndexes = indexes.filter(idx => idx.name?.includes('stage'));

    if (stageIndexes.length === 0) {
      console.log('⚠️  No stage-related indexes found!');
      console.log('   Run "npm run indexes:create" to create them.\n');
    } else {
      console.log(`✓ Found ${stageIndexes.length} stage-related indexes\n`);
    }

    // Sample query performance (if data exists)
    if (stats.count > 0) {
      console.log('Testing query performance...\n');

      const queries = [
        {
          name: 'Find by stage type',
          query: { 'stages.type': 'ai_interview' },
        },
        {
          name: 'Find active applications',
          query: { isDisqualified: false },
        },
        {
          name: 'Find by user (compound)',
          query: { userId: 'test_user', isDisqualified: false },
        },
      ];

      for (const q of queries) {
        const start = Date.now();
        const count = await applications.countDocuments(q.query);
        const duration = Date.now() - start;

        const performance =
          duration < 10 ? '✓ Fast' : duration < 50 ? '~ OK' : '✗ Slow';
        console.log(
          `  ${q.name}: ${count} docs in ${duration}ms ${performance}`
        );
      }
    }
  } catch (error) {
    console.error('Analysis failed:', error);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  const config: IndexConfig = {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB || 'test',
    dryRun: args.includes('--dry-run'),
  };

  console.log('='.repeat(80));
  console.log('MONGODB STAGE INDEXES MANAGEMENT');
  console.log('='.repeat(80));
  console.log(`Command: ${command}`);
  console.log(`MongoDB URI: ${config.mongoUri}`);
  console.log(`Database: ${config.dbName}`);
  if (config.dryRun) console.log('Mode: DRY RUN');
  console.log('='.repeat(80));

  let client: MongoClient | null = null;

  try {
    client = await MongoClient.connect(config.mongoUri);
    const db = client.db(config.dbName);

    switch (command) {
      case 'create':
        await createStageIndexes(db, config.dryRun);
        break;

      case 'list':
        await listIndexes(db);
        break;

      case 'drop':
        await dropStageIndexes(db, config.dryRun);
        break;

      case 'analyze':
        await analyzeIndexes(db);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  create   - Create all stage-related indexes');
        console.log('  list     - List existing indexes');
        console.log('  drop     - Drop stage-related indexes');
        console.log('  analyze  - Analyze index usage and performance');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export { createStageIndexes, listIndexes, dropStageIndexes, analyzeIndexes };
