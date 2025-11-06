// EP5-S4: Commit recording blocks to finalize Azure Blob Storage upload
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { AzureBlobInterviewStorage } from '../../../../services/storage/azureBlobStorage';
import { logger } from '../../../../monitoring/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;

    if (!session || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, blobName, blockIds } = await req.json();

    if (!applicationId || !blobName || !blockIds || !Array.isArray(blockIds)) {
      return NextResponse.json(
        { error: 'applicationId, blobName, and blockIds required' },
        { status: 400 }
      );
    }

    // Check Azure storage configuration
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      logger.error({
        event: 'commit_recording_no_azure_config',
        applicationId,
      });
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 500 }
      );
    }

    // Initialize storage
    const storage = new AzureBlobInterviewStorage(
      connectionString,
      'interview-recordings'
    );

    // Commit blocks
    const url = await storage.commitBlocks(blobName, blockIds, {
      userId,
      applicationId,
    });

    logger.info({
      event: 'recording_committed',
      applicationId,
      userId,
      blobName,
      totalBlocks: blockIds.length,
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    logger.error({
      event: 'commit_recording_error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to commit recording' },
      { status: 500 }
    );
  }
}
