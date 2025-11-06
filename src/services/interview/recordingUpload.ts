// EP5-S4: Recording upload handler with Azure Blob Storage integration

import { logger } from '../../monitoring/logger';
import { BlockBlobClient } from '@azure/storage-blob';

export interface UploadResult {
  success: boolean;
  url?: string;
  blobName?: string;
  error?: string;
}

interface UploadTokenResponse {
  uploadUrl: string;
  blobUrl: string;
  blobName: string;
  containerName: string;
  expiresAt: string;
}

/**
 * Get SAS token for uploading recording
 */
async function getUploadToken(
  applicationId: string,
  filename: string,
  contentType: string
): Promise<UploadTokenResponse> {
  const response = await fetch('/api/interview/recording-upload-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, filename, contentType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload token');
  }

  return response.json();
}

/**
 * Upload recording blob to Azure Blob Storage
 *
 * @param applicationId - Application ID for organizing recordings
 * @param blob - Recording blob to upload
 * @param metadata - Recording metadata
 */
export async function uploadRecording(
  applicationId: string,
  blob: Blob,
  metadata?: Record<string, unknown>
): Promise<UploadResult> {
  logger.info({
    event: 'recording_upload_started',
    applicationId,
    blobSize: blob.size,
    blobType: blob.type,
    metadata,
  });

  try {
    // Generate filename
    const timestamp = Date.now();
    const filename = `interview-recording-${timestamp}.webm`;

    // Get SAS token for upload
    const tokenResponse = await getUploadToken(
      applicationId,
      filename,
      blob.type || 'video/webm'
    );

    logger.info({
      event: 'recording_upload_token_received',
      applicationId,
      blobName: tokenResponse.blobName,
    });

    // Create BlockBlobClient with SAS URL
    const blockBlobClient = new BlockBlobClient(tokenResponse.uploadUrl);

    // Upload blob with metadata (Azure requires all values to be strings)
    const serializedMetadata: Record<string, string> = {
      applicationId,
      uploadedAt: new Date().toISOString(),
    };

    // Serialize metadata values to strings
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        serializedMetadata[key] =
          typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    await blockBlobClient.upload(blob, blob.size, {
      blobHTTPHeaders: {
        blobContentType: blob.type || 'video/webm',
      },
      metadata: serializedMetadata,
    });

    logger.info({
      event: 'recording_upload_complete',
      applicationId,
      blobName: tokenResponse.blobName,
      size: blob.size,
    });

    return {
      success: true,
      url: tokenResponse.blobUrl,
      blobName: tokenResponse.blobName,
    };
  } catch (err) {
    logger.error({
      event: 'recording_upload_failed',
      applicationId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

/**
 * Upload recording chunk progressively
 * Useful for large recordings to avoid memory issues
 *
 * @param applicationId - Application ID
 * @param chunk - Recording chunk blob
 * @param chunkIndex - Index of this chunk
 * @param uploadContext - Upload context from initializeChunkedUpload
 */
export async function uploadRecordingChunk(
  applicationId: string,
  chunk: Blob,
  chunkIndex: number,
  uploadContext?: {
    uploadUrl: string;
    blockIds: string[];
  }
): Promise<UploadResult> {
  logger.info({
    event: 'recording_chunk_upload',
    applicationId,
    chunkIndex,
    chunkSize: chunk.size,
  });

  try {
    if (!uploadContext) {
      throw new Error('Upload context required for chunk upload');
    }

    // Create BlockBlobClient with SAS URL
    const blockBlobClient = new BlockBlobClient(uploadContext.uploadUrl);

    // Generate block ID (base64 encoded, must be same length for all blocks)
    const blockId = btoa(`block-${chunkIndex.toString().padStart(6, '0')}`);
    uploadContext.blockIds.push(blockId);

    // Convert blob to ArrayBuffer
    const arrayBuffer = await chunk.arrayBuffer();

    // Upload block
    await blockBlobClient.stageBlock(
      blockId,
      arrayBuffer,
      arrayBuffer.byteLength
    );

    logger.info({
      event: 'recording_chunk_uploaded',
      applicationId,
      chunkIndex,
      blockId,
    });

    return {
      success: true,
    };
  } catch (err) {
    logger.error({
      event: 'recording_chunk_upload_failed',
      applicationId,
      chunkIndex,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Chunk upload failed',
    };
  }
}

/**
 * Initialize chunked upload session
 * Returns upload context needed for uploadRecordingChunk
 */
export async function initializeChunkedUpload(
  applicationId: string,
  filename: string,
  contentType: string
): Promise<{
  uploadUrl: string;
  blobUrl: string;
  blobName: string;
  blockIds: string[];
}> {
  const tokenResponse = await getUploadToken(
    applicationId,
    filename,
    contentType
  );

  logger.info({
    event: 'chunked_upload_initialized',
    applicationId,
    blobName: tokenResponse.blobName,
  });

  return {
    ...tokenResponse,
    blockIds: [],
  };
}

/**
 * Finalize chunked upload by committing all blocks
 */
export async function finalizeChunkedUpload(
  uploadUrl: string,
  blockIds: string[],
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    const blockBlobClient = new BlockBlobClient(uploadUrl);

    // Commit block list
    await blockBlobClient.commitBlockList(blockIds, {
      blobHTTPHeaders: {
        blobContentType: 'video/webm',
      },
      metadata,
    });

    logger.info({
      event: 'chunked_upload_finalized',
      totalBlocks: blockIds.length,
    });

    return {
      success: true,
    };
  } catch (err) {
    logger.error({
      event: 'chunked_upload_finalize_failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Finalize failed',
    };
  }
}
