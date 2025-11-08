/**
 * Development Setup Script
 *
 * Drops applications collection and creates indexes for new stage-based schema.
 * USE ONLY IN DEVELOPMENT - This will DELETE ALL APPLICATIONS!
 * (Other collections like users, jobs, etc. will be preserved)
 *
 * Usage:
 *   npm run dev:reset-db
 *
 * @module dev-reset-db
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { createStageIndexes } from './migrations/create-stage-indexes';

// Load environment variables
dotenv.config();

async function resetDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'test';

  console.log('='.repeat(80));
  console.log('⚠️  DEVELOPMENT APPLICATIONS COLLECTION RESET');
  console.log('='.repeat(80));
  console.log(`MongoDB URI: ${mongoUri}`);
  console.log(`Database: ${dbName}`);
  console.log('');
  console.log('⚠️  WARNING: This will DELETE ALL APPLICATIONS!');
  console.log('   (Other collections will be preserved)');
  console.log('='.repeat(80));
  console.log('');

  // Safety check - only allow in development
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Cannot run in production environment!');
    console.error('   This script is for development only.');
    process.exit(1);
  }

  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);

    // Drop the applications collection only
    console.log(`\nDropping "applications" collection...`);
    try {
      await db.collection('applications').drop();
      console.log('✓ Applications collection dropped\n');
    } catch (error: any) {
      if (error.codeName === 'NamespaceNotFound') {
        console.log(
          '⊘ Applications collection does not exist (will be created)\n'
        );
      } else {
        throw error;
      }
    }

    // Recreate with indexes
    console.log('Creating indexes for new stage-based schema...\n');
    await createStageIndexes(db, false);

    console.log('='.repeat(80));
    console.log('✅ Applications collection reset complete!');
    console.log('='.repeat(80));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start your application: npm run dev');
    console.log('  2. Create test applications with the new stage-based model');
    console.log('  3. Verify stages work correctly in the UI');
    console.log('');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed\n');
    }
  }
}

// Execute
if (require.main === module) {
  resetDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };
