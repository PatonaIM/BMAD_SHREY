#!/usr/bin/env tsx

/**
 * Create Vector Search Indexes for MongoDB Atlas
 *
 * This script creates standard indexes and outputs the configuration for Atlas Vector Search indexes.
 *
 * Collections with vector search:
 * 1. jobVectors.embedding (verify exists)
 * 2. resume_vectors.embeddings (verify exists)
 * Run: npx tsx scripts/migrations/create-vector-indexes.ts
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { getMongoClient } from '../../src/data-access/mongoClient';
import { logger } from '../../src/monitoring/logger';

async function createVectorSearchIndexes() {
  try {
    logger.info({ msg: 'Starting vector search index creation' });

    const client = await getMongoClient();
    const db = client.db();

    // Collection 1: jobVectors (NEW)
    logger.info({ msg: 'Creating jobVectors collection indexes' });
    const jobVectors = db.collection('jobVectors');

    // Index 1: jobId (unique for lookups)
    await jobVectors.createIndex(
      { jobId: 1 },
      {
        unique: true,
        name: 'jobId_unique',
      }
    );
    logger.info({ msg: 'Created jobId unique index' });

    // Index 2: version (for filtering old versions)
    await jobVectors.createIndex(
      { version: 1 },
      {
        name: 'version_idx',
      }
    );
    logger.info({ msg: 'Created version index' });

    // Index 3: createdAt (for sorting/filtering)
    await jobVectors.createIndex(
      { createdAt: -1 },
      {
        name: 'createdAt_desc',
      }
    );
    logger.info({ msg: 'Created createdAt index' });

    // Collection 2: resume_vectors (verify exists)
    logger.info({ msg: 'Verifying resume_vectors collection indexes' });
    const resumeVectors = db.collection('resume_vectors');

    // Index: userId (for lookups)
    await resumeVectors.createIndex(
      { userId: 1 },
      {
        name: 'userId_idx',
      }
    );
    logger.info({ msg: 'Created/verified userId index on resume_vectors' });

    logger.info({
      msg: 'Vector search indexes created successfully',
      note: 'IMPORTANT: You must create Vector Search indexes manually in MongoDB Atlas UI',
    });

    console.log('\n✅ Standard indexes created successfully!\n');
    console.log(
      '📝 NEXT STEPS: Create Vector Search indexes in MongoDB Atlas:\n'
    );
    console.log('1. Go to MongoDB Atlas → Database → Search Indexes');
    console.log('2. Click "Create Search Index" → "JSON Editor"');
    console.log('\n3. For jobVectors collection, use this configuration:');
    console.log(
      JSON.stringify(
        {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: 1536,
              similarity: 'cosine',
            },
          ],
        },
        null,
        2
      )
    );
    console.log('   Index name: job_vector_index');
    console.log('   Database: (your database name)');
    console.log('   Collection: jobVectors');
    console.log(
      '\n4. For resume_vectors collection (if not exists), use this configuration:'
    );
    console.log(
      JSON.stringify(
        {
          fields: [
            {
              type: 'vector',
              path: 'embeddings',
              numDimensions: 1536,
              similarity: 'cosine',
            },
          ],
        },
        null,
        2
      )
    );
    console.log('   Index name: resume_vector_index');
    console.log('   Database: (your database name)');
    console.log('   Collection: resume_vectors');
    console.log('\n5. Wait for indexes to build (5-10 minutes)');
    console.log('6. Verify indexes appear in the Search Indexes tab\n');

    process.exit(0);
  } catch (error) {
    logger.error({
      msg: 'Vector search index creation failed',
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('❌ Index creation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createVectorSearchIndexes();
}

export { createVectorSearchIndexes };
