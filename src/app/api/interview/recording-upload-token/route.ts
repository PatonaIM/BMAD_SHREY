// EP5-S4: Generate SAS token for interview recording upload
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { logger } from '../../../../monitoring/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;

    if (!session || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, filename, contentType } = await req.json();

    if (!applicationId || !filename) {
      return NextResponse.json(
        { error: 'applicationId and filename required' },
        { status: 400 }
      );
    }

    // Check Azure storage configuration
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName =
      process.env.AZURE_STORAGE_RECORDINGS_CONTAINER || 'interview-recordings';

    if (!connectionString) {
      logger.error({
        event: 'recording_upload_token_no_azure_config',
        applicationId,
      });
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 500 }
      );
    }

    // Parse connection string to get account name and key
    const accountMatch = connectionString.match(/AccountName=([^;]+)/);
    const keyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountMatch || !keyMatch) {
      logger.error({
        event: 'recording_upload_token_invalid_connection_string',
      });
      return NextResponse.json(
        { error: 'Invalid Azure connection string' },
        { status: 500 }
      );
    }

    const accountName = accountMatch[1]!;
    const accountKey = keyMatch[1]!;

    // Create storage path: applicationId/userId-timestamp-filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = `${applicationId}/${userId}-${timestamp}-${safeName}`;

    // Generate SAS token with write permissions (valid for 1 hour)
    // Note: For progressive uploads using stageBlock/commitBlockList, we need:
    // - create: Create blob
    // - write: Write data (stageBlock)
    // - read: Read blocks for commit (commitBlockList needs to verify blocks)
    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const sasPermissions = new BlobSASPermissions();
    sasPermissions.create = true; // Create blob
    sasPermissions.write = true; // Write blocks
    sasPermissions.read = true; // Read blocks for commit

    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: sasPermissions,
        expiresOn,
        contentType: contentType || 'video/webm',
      },
      sharedKeyCredential
    ).toString();

    // Construct upload URL
    const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

    // Also construct the final blob URL (without SAS token for storage)
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;

    logger.info({
      event: 'recording_upload_token_generated',
      applicationId,
      userId,
      blobName,
      expiresAt: expiresOn.toISOString(),
    });

    return NextResponse.json({
      uploadUrl,
      blobUrl,
      blobName,
      containerName,
      expiresAt: expiresOn.toISOString(),
    });
  } catch (err) {
    logger.error({
      event: 'recording_upload_token_error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to generate upload token' },
      { status: 500 }
    );
  }
}
