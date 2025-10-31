#!/usr/bin/env tsx
/**
 * Configure CORS for Azure Blob Storage
 * This script configures CORS settings to allow video playback from browsers
 *
 * Usage: npx tsx scripts/configure-azure-cors.ts
 */

import { BlobServiceClient } from '@azure/storage-blob';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function configureCORS() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not found in environment');
  }

  console.log('Connecting to Azure Blob Storage...');
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  console.log('Configuring CORS settings...');

  try {
    await blobServiceClient.setProperties({
      cors: [
        {
          allowedOrigins: '*', // In production, replace with your domain
          allowedMethods: 'GET,HEAD,OPTIONS',
          allowedHeaders:
            'Content-Type,Range,Accept,Accept-Encoding,If-Modified-Since,If-None-Match',
          exposedHeaders:
            'Content-Length,Content-Range,Content-Type,Accept-Ranges,ETag,Last-Modified',
          maxAgeInSeconds: 3600,
        },
      ],
      deleteRetentionPolicy: {
        enabled: false, // Don't keep deleted blobs
      },
    });

    console.log('✓ CORS configured successfully!');
    console.log('Settings:');
    console.log('  - Allowed Origins: * (all)');
    console.log('  - Allowed Methods: GET, HEAD, OPTIONS');
    console.log('  - Max Age: 3600 seconds (1 hour)');
    console.log('');
    console.log(
      'Note: For production, update allowedOrigins to your specific domain.'
    );
  } catch (error) {
    console.error('Failed to configure CORS:', error);
    throw error;
  }
}

// Run the configuration
configureCORS()
  .then(() => {
    console.log('\n✨ CORS configuration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Configuration failed:', error);
    process.exit(1);
  });
