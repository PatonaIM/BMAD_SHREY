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
dotenv.config({ path: resolve(__dirname, '../.env') }); // Fallback to .env

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
          allowedMethods: 'GET,HEAD,OPTIONS,PUT,POST', // Added PUT/POST for uploads
          allowedHeaders:
            'Content-Type,Range,Accept,Accept-Encoding,If-Modified-Since,If-None-Match,x-ms-blob-type,x-ms-blob-content-type,x-ms-version,x-ms-date,x-ms-blob-content-disposition,x-ms-meta-*',
          exposedHeaders:
            'Content-Length,Content-Range,Content-Type,Accept-Ranges,ETag,Last-Modified,x-ms-request-id,x-ms-version',
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
    console.log('  - Allowed Methods: GET, HEAD, OPTIONS, PUT, POST');
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
