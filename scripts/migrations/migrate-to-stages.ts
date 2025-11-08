/**
 * Migration Script: Status-Based to Stage-Based Application Model
 *
 * This script migrates applications from the old single-status model
 * to the new multi-stage timeline model introduced in Epic 5.
 *
 * Usage:
 *   npm run migration:stages:dry-run    # Test without modifying data
 *   npm run migration:stages:execute    # Run actual migration
 *   npm run migration:stages:rollback   # Revert to old model
 *
 * @module migrate-to-stages
 */

import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';
import {
  ApplicationStage,
  StageType,
  StageStatus,
  SubmitApplicationData,
  AiInterviewData,
  UnderReviewData,
  AssignmentData,
  LiveInterviewData,
  OfferData,
  OfferAcceptedData,
  DisqualifiedData,
} from '../../src/shared/types/applicationStage';

// Load environment variables
dotenv.config();

// Old application status enum
type OldApplicationStatus =
  | 'submitted'
  | 'ai_interview'
  | 'under_review'
  | 'assignment'
  | 'live_interview'
  | 'offer'
  | 'offer_accepted'
  | 'disqualified';

interface OldApplication {
  _id: string;
  status: OldApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
  // Other fields preserved as-is
  [key: string]: any;
}

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ applicationId: string; error: string }>;
}

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  mongoUri: string;
  dbName: string;
}

/**
 * Status to stages mapping
 * Converts old single status to array of stage objects
 */
const STATUS_TO_STAGES_MAP: Record<
  OldApplicationStatus,
  Array<{ type: StageType; status: StageStatus }>
> = {
  submitted: [{ type: 'submit_application', status: 'completed' }],

  ai_interview: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'in_progress' },
  ],

  under_review: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'completed' },
    { type: 'under_review', status: 'in_progress' },
  ],

  assignment: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'completed' },
    { type: 'under_review', status: 'completed' },
    { type: 'assignment', status: 'in_progress' },
  ],

  live_interview: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'completed' },
    { type: 'under_review', status: 'completed' },
    { type: 'live_interview', status: 'in_progress' },
  ],

  offer: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'completed' },
    { type: 'under_review', status: 'completed' },
    { type: 'live_interview', status: 'completed' },
    { type: 'offer', status: 'in_progress' },
  ],

  offer_accepted: [
    { type: 'submit_application', status: 'completed' },
    { type: 'ai_interview', status: 'completed' },
    { type: 'under_review', status: 'completed' },
    { type: 'live_interview', status: 'completed' },
    { type: 'offer', status: 'completed' },
    { type: 'offer_accepted', status: 'completed' },
  ],

  disqualified: [
    { type: 'submit_application', status: 'completed' },
    { type: 'disqualified', status: 'completed' },
  ],
};

/**
 * Generate unique stage ID
 */
function generateStageId(): string {
  return `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create stage data based on stage type
 */
function createStageData(
  type: StageType,
  application: OldApplication,
  _order: number
): ApplicationStage['data'] {
  const now = new Date();

  switch (type) {
    case 'submit_application':
      return {
        type: 'submit_application',
        submittedAt: application.createdAt || now,
        resumeUrl: application.resumeUrl,
        coverLetter: application.coverLetter,
      } as SubmitApplicationData;

    case 'ai_interview':
      return {
        type: 'ai_interview',
        interviewSessionId: application.interviewSessionId,
        interviewScore: application.aiInterviewScore,
        interviewCompletedAt: application.aiInterviewCompletedAt,
      } as AiInterviewData;

    case 'under_review':
      return {
        type: 'under_review',
        reviewStartedAt: now,
        reviewedBy: application.reviewedBy,
      } as UnderReviewData;

    case 'assignment':
      return {
        type: 'assignment',
        title: 'Technical Assignment',
        description: 'Complete the assigned technical challenge',
        isExternalLink: false,
        sentAt: now,
        durationMinutes: 60,
      } as AssignmentData;

    case 'live_interview':
      return {
        type: 'live_interview',
        title: 'Live Interview',
        durationMinutes: 60,
        scheduledTime: application.interviewScheduledAt,
        meetLink: application.meetLink,
        completedAt: application.interviewCompletedAt,
      } as LiveInterviewData;

    case 'offer':
      return {
        type: 'offer',
        sentAt: now,
        expiresAt: application.offerExpiresAt,
        offerLetterUrl: application.offerLetterUrl,
      } as OfferData;

    case 'offer_accepted':
      return {
        type: 'offer_accepted',
        acceptedAt: application.offerAcceptedAt || now,
        startDate: application.startDate,
      } as OfferAcceptedData;

    case 'disqualified':
      return {
        type: 'disqualified',
        disqualifiedAt: application.disqualifiedAt || now,
        reason: application.disqualificationReason || 'Not specified',
        disqualifiedBy: application.disqualifiedBy,
      } as DisqualifiedData;

    default:
      throw new Error(`Unknown stage type: ${type}`);
  }
}

/**
 * Migrate a single application from old to new model
 */
function migrateApplication(application: OldApplication): {
  stages: ApplicationStage[];
  currentStageId: string | null;
  isDisqualified: boolean;
} {
  const stageConfigs = STATUS_TO_STAGES_MAP[application.status];

  if (!stageConfigs) {
    throw new Error(`Unknown status: ${application.status}`);
  }

  const stages: ApplicationStage[] = stageConfigs.map((config, index) => {
    const stageId = generateStageId();
    const now = new Date();

    const stage: ApplicationStage = {
      id: stageId,
      type: config.type,
      order: index,
      status: config.status,
      title: undefined,
      visibleToCandidate: true,
      data: createStageData(config.type, application, index),
      createdAt: now,
      updatedAt: now,
      completedAt: config.status === 'completed' ? now : undefined,
      candidateActions: [],
      recruiterActions: [],
    };

    return stage;
  });

  // Find current stage (first non-completed stage)
  const currentStage = stages.find(s => s.status !== 'completed');
  const currentStageId =
    currentStage?.id || stages[stages.length - 1]?.id || null;

  // Check if application is disqualified
  const isDisqualified = application.status === 'disqualified';

  return { stages, currentStageId, isDisqualified };
}

/**
 * Create MongoDB indexes for stage queries
 */
async function createIndexes(db: Db): Promise<void> {
  const applications = db.collection('applications');

  console.log('Creating indexes for stage-based queries...');

  await applications.createIndex(
    { 'stages.type': 1 },
    { name: 'stages_type_idx' }
  );
  console.log('✓ Created index: stages.type');

  await applications.createIndex(
    { 'stages.status': 1 },
    { name: 'stages_status_idx' }
  );
  console.log('✓ Created index: stages.status');

  await applications.createIndex(
    { 'stages.order': 1 },
    { name: 'stages_order_idx' }
  );
  console.log('✓ Created index: stages.order');

  await applications.createIndex(
    { currentStageId: 1 },
    { name: 'current_stage_id_idx' }
  );
  console.log('✓ Created index: currentStageId');

  await applications.createIndex(
    { isDisqualified: 1 },
    { name: 'is_disqualified_idx' }
  );
  console.log('✓ Created index: isDisqualified');

  // Compound indexes for common queries
  await applications.createIndex(
    { userId: 1, isDisqualified: 1 },
    { name: 'user_disqualified_idx' }
  );
  console.log('✓ Created compound index: userId + isDisqualified');

  await applications.createIndex(
    { jobId: 1, 'stages.status': 1 },
    { name: 'job_stage_status_idx' }
  );
  console.log('✓ Created compound index: jobId + stages.status');

  console.log('✅ All indexes created successfully\n');
}

/**
 * Run migration in batches
 */
async function runMigration(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(config.mongoUri);
    const db = client.db(config.dbName);
    const applications = db.collection('applications');

    // Count total applications
    stats.total = await applications.countDocuments({});
    console.log(`Found ${stats.total} applications to migrate\n`);

    if (stats.total === 0) {
      console.log('No applications to migrate');
      return stats;
    }

    // Create indexes first
    if (!config.dryRun) {
      await createIndexes(db);
    }

    // Process in batches
    let skip = 0;
    let batch = 0;

    while (skip < stats.total) {
      batch++;
      console.log(
        `Processing batch ${batch} (${skip + 1}-${Math.min(skip + config.batchSize, stats.total)} of ${stats.total})...`
      );

      const batchApps = await applications
        .find({})
        .skip(skip)
        .limit(config.batchSize)
        .toArray();

      for (const app of batchApps) {
        try {
          // Skip if already migrated
          if (app.stages && Array.isArray(app.stages)) {
            stats.skipped++;
            continue;
          }

          // Migrate application
          const { stages, currentStageId, isDisqualified } = migrateApplication(
            app as unknown as OldApplication
          );

          if (config.dryRun) {
            // Dry run: just count
            stats.migrated++;
            console.log(
              `  [DRY RUN] Would migrate ${app._id}: ${app.status} → ${stages.length} stages`
            );
          } else {
            // Actually update the document
            await applications.updateOne(
              { _id: app._id },
              {
                $set: {
                  stages,
                  currentStageId,
                  isDisqualified,
                  migratedAt: new Date(),
                },
              }
            );
            stats.migrated++;
            console.log(
              `  ✓ Migrated ${app._id}: ${app.status} → ${stages.length} stages`
            );
          }
        } catch (error) {
          stats.failed++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          stats.errors.push({
            applicationId: String(app._id),
            error: errorMsg,
          });
          console.error(`  ✗ Failed to migrate ${app._id}: ${errorMsg}`);
        }
      }

      skip += config.batchSize;

      // Progress update
      const progress = Math.min(100, Math.round((skip / stats.total) * 100));
      console.log(`Progress: ${progress}%\n`);
    }

    return stats;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
  }
}

/**
 * Rollback migration (restore old model)
 */
async function rollbackMigration(config: MigrationConfig): Promise<void> {
  let client: MongoClient | null = null;

  try {
    console.log('Starting rollback...\n');
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(config.mongoUri);
    const db = client.db(config.dbName);
    const applications = db.collection('applications');

    const count = await applications.countDocuments({
      stages: { $exists: true },
    });
    console.log(`Found ${count} migrated applications\n`);

    if (count === 0) {
      console.log('No migrated applications to rollback');
      return;
    }

    if (config.dryRun) {
      console.log(`[DRY RUN] Would rollback ${count} applications`);
    } else {
      const result = await applications.updateMany(
        { stages: { $exists: true } },
        {
          $unset: {
            stages: '',
            currentStageId: '',
            isDisqualified: '',
            migratedAt: '',
          },
        }
      );

      console.log(`✅ Rolled back ${result.modifiedCount} applications`);
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'dry-run';

  // Configuration
  const config: MigrationConfig = {
    dryRun: command === 'dry-run',
    batchSize: 100,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB || 'test',
  };

  console.log('='.repeat(60));
  console.log('APPLICATION STAGE MIGRATION SCRIPT');
  console.log('='.repeat(60));
  console.log(`Command: ${command}`);
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`MongoDB URI: ${config.mongoUri}`);
  console.log(`Database: ${config.dbName}`);
  console.log(`Batch Size: ${config.batchSize}`);
  console.log('='.repeat(60));
  console.log('');

  if (command === 'rollback') {
    // Rollback migration
    await rollbackMigration(config);
  } else {
    // Run migration
    const stats = await runMigration(config);

    console.log('='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total applications: ${stats.total}`);
    console.log(`✓ Migrated: ${stats.migrated}`);
    console.log(`⊘ Skipped (already migrated): ${stats.skipped}`);
    console.log(`✗ Failed: ${stats.failed}`);
    console.log('='.repeat(60));

    if (stats.errors.length > 0) {
      console.log('\nERRORS:');
      stats.errors.forEach(err => {
        console.log(`  ${err.applicationId}: ${err.error}`);
      });
    }

    if (config.dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was modified.');
      console.log('Run with "execute" to perform actual migration.\n');
    } else {
      console.log('\n✅ Migration completed successfully!\n');
    }
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateApplication, createIndexes, runMigration, rollbackMigration };
