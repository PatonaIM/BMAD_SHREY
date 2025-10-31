import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { createHash } from 'crypto';
import type { StoredFileInfo, ResumeStorage } from './resumeStorage';

export class AzureBlobResumeStorage implements ResumeStorage {
  private containerClient: ContainerClient;

  constructor(connectionString: string, containerName: string) {
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  async store(
    userId: string,
    fileName: string,
    mimeType: string,
    data: Buffer
  ): Promise<StoredFileInfo> {
    // Calculate SHA256 hash for integrity
    const hash = createHash('sha256').update(data).digest('hex');

    // Sanitize filename to remove special characters
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create storage key: userId/timestamp-filename
    const storageKey = `${userId}/${Date.now()}-${safeName}`;

    // Get block blob client
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    // Upload with metadata
    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentDisposition: `attachment; filename="${fileName}"`,
      },
      metadata: {
        userId,
        originalFileName: fileName,
        sha256: hash,
        uploadedAt: new Date().toISOString(),
      },
    });

    return {
      storageKey,
      sha256: hash,
      bytes: data.length,
      mimeType,
    };
  }

  async getViewUrl(storageKey: string): Promise<string> {
    // For security, we still serve through our API route
    // which validates user permissions before returning the file
    const encodedKey = encodeURIComponent(storageKey);
    return `/api/resume/view/${encodedKey}`;
  }

  async get(storageKey: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new Error(`Resume file not found: ${storageKey}`);
    }

    // Download blob
    const downloadResponse = await blockBlobClient.download(0);

    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download resume: no stream body');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete a resume file from storage
   * @param storageKey - The storage key of the file to delete
   */
  async delete(storageKey: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    await blockBlobClient.deleteIfExists();
  }

  /**
   * List all resume files for a specific user
   * @param userId - The user ID to list files for
   */
  async listUserResumes(userId: string): Promise<string[]> {
    const prefix = `${userId}/`;
    const storageKeys: string[] = [];

    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      storageKeys.push(blob.name);
    }

    return storageKeys;
  }
}

/**
 * Interview Recording Metadata
 */
export interface InterviewRecordingMetadata {
  sessionId: string;
  userId: string;
  applicationId: string;
  duration: number; // milliseconds
  fileSize: number; // bytes
  mimeType: string;
  videoResolution: string;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  uploadedAt: string; // ISO timestamp
  sha256?: string; // optional hash for integrity
}

/**
 * Azure Blob Storage for Interview Recordings
 *
 * Handles upload, retrieval, and management of interview video recordings
 */
export class AzureBlobInterviewStorage {
  private containerClient: ContainerClient;
  private blobServiceClient: BlobServiceClient;
  private accountName: string;
  private accountKey: string;

  constructor(
    connectionString: string,
    containerName = 'interview-recordings'
  ) {
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient =
      this.blobServiceClient.getContainerClient(containerName);

    // Parse account name and key from connection string for SAS generation
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountNameMatch || !accountKeyMatch) {
      throw new Error(
        'Invalid Azure Storage connection string: Missing AccountName or AccountKey'
      );
    }

    this.accountName = accountNameMatch[1] || '';
    this.accountKey = accountKeyMatch[1] || '';

    if (!this.accountName || !this.accountKey) {
      throw new Error(
        'Failed to parse account credentials from connection string'
      );
    }
  }

  /**
   * Initialize container (create if doesn't exist) and configure CORS
   */
  async initialize(): Promise<void> {
    await this.containerClient.createIfNotExists();

    // Configure CORS for video playback from browsers
    try {
      const serviceClient = this.blobServiceClient;
      await serviceClient.setProperties({
        cors: [
          {
            allowedOrigins: '*', // In production, specify your domain
            allowedMethods: 'GET,HEAD,OPTIONS',
            allowedHeaders: '*',
            exposedHeaders: '*',
            maxAgeInSeconds: 3600,
          },
        ],
      });
    } catch {
      // CORS configuration might fail if already set or insufficient permissions
      // Silently continue - not critical for operation
    }
    // Note: Container is private by default, access only via SAS tokens
  }

  /**
   * Upload interview recording
   */
  async uploadRecording(
    sessionId: string,
    userId: string,
    applicationId: string,
    recordingBlob: Blob,
    metadata: Omit<
      InterviewRecordingMetadata,
      'sessionId' | 'userId' | 'applicationId' | 'uploadedAt' | 'sha256'
    >
  ): Promise<{ storageKey: string; url: string }> {
    // Convert Blob to Buffer
    const arrayBuffer = await recordingBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate SHA256 hash for integrity
    const hash = createHash('sha256').update(buffer).digest('hex');

    // Create storage key: userId/applicationId/sessionId/recording.webm
    const extension = this.getExtensionFromMimeType(metadata.mimeType);
    const storageKey = `${userId}/${applicationId}/${sessionId}/recording${extension}`;

    // Get block blob client
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    // Upload with metadata
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: metadata.mimeType,
        blobCacheControl: 'public, max-age=31536000', // 1 year cache
      },
      metadata: {
        sessionId,
        userId,
        applicationId,
        duration: metadata.duration.toString(),
        fileSize: metadata.fileSize.toString(),
        mimeType: metadata.mimeType,
        videoResolution: metadata.videoResolution,
        frameRate: metadata.frameRate.toString(),
        videoBitrate: metadata.videoBitrate.toString(),
        audioBitrate: metadata.audioBitrate.toString(),
        uploadedAt: new Date().toISOString(),
        sha256: hash,
      },
    });

    // Generate signed URL (valid for 7 days)
    const url = await this.getSignedUrl(storageKey, 7 * 24 * 60);

    return { storageKey, url };
  }

  /**
   * Upload a chunk (block) of video data
   * Used for streaming uploads during recording
   */
  async uploadChunk(
    blobName: string,
    chunk: Blob,
    blockId: string
  ): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    // Convert Blob to Buffer
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload block (stage it, don't commit yet)
    await blockBlobClient.stageBlock(blockId, buffer, buffer.length);
  }

  /**
   * Commit all uploaded blocks into a single blob
   * Call this after all chunks have been uploaded
   */
  async commitBlocks(
    blobName: string,
    blockIds: string[],
    metadata?: {
      sessionId?: string;
      userId?: string;
      applicationId?: string;
      duration?: number;
      fileSize?: number;
    }
  ): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    // Prepare metadata for the blob
    const blobMetadata: Record<string, string> = {
      uploadedAt: new Date().toISOString(),
    };

    if (metadata) {
      if (metadata.sessionId) blobMetadata.sessionId = metadata.sessionId;
      if (metadata.userId) blobMetadata.userId = metadata.userId;
      if (metadata.applicationId)
        blobMetadata.applicationId = metadata.applicationId;
      if (metadata.duration)
        blobMetadata.duration = metadata.duration.toString();
      if (metadata.fileSize)
        blobMetadata.fileSize = metadata.fileSize.toString();
    }

    // Commit the blocks in order with proper headers and metadata
    await blockBlobClient.commitBlockList(blockIds, {
      blobHTTPHeaders: {
        blobContentType: 'video/webm',
        blobCacheControl: 'public, max-age=31536000', // 1 year cache
        // Add content disposition for inline display
        blobContentDisposition: 'inline',
      },
      metadata: blobMetadata,
    });

    // Generate signed URL (valid for 7 days)
    const url = await this.getSignedUrl(blobName, 7 * 24 * 60);

    return url;
  }

  /**
   * Get signed URL for recording playback
   */
  async getSignedUrl(storageKey: string, expiryMinutes = 60): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    // Check if blob exists by trying to get properties (uses auth from connection string)
    try {
      const properties = await blockBlobClient.getProperties();

      // Verify content type is set correctly
      if (properties.contentType !== 'video/webm') {
        // Try to fix content type if it's wrong
        await blockBlobClient.setHTTPHeaders({
          blobContentType: 'video/webm',
          blobCacheControl: 'public, max-age=31536000',
          blobContentDisposition: 'inline',
        });
      }
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('BlobNotFound') || err.message.includes('404')) {
        throw new Error(`Recording not found: ${storageKey}`);
      }
      throw error;
    }

    // Create SAS token with read permissions
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

    const permissions = BlobSASPermissions.parse('r'); // Read-only
    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: storageKey,
        permissions,
        startsOn,
        expiresOn,
        contentType: 'video/webm', // Specify content type in SAS
      },
      sharedKeyCredential
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }

  /**
   * Get recording metadata
   */
  async getMetadata(
    storageKey: string
  ): Promise<InterviewRecordingMetadata | null> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    try {
      const properties = await blockBlobClient.getProperties();
      const metadata = properties.metadata;

      if (!metadata) {
        return null;
      }

      return {
        sessionId: metadata.sessionId || '',
        userId: metadata.userId || '',
        applicationId: metadata.applicationId || '',
        duration: parseInt(metadata.duration || '0', 10),
        fileSize: parseInt(metadata.fileSize || '0', 10),
        mimeType: metadata.mimeType || '',
        videoResolution: metadata.videoResolution || '',
        frameRate: parseInt(metadata.frameRate || '0', 10),
        videoBitrate: parseInt(metadata.videoBitrate || '0', 10),
        audioBitrate: parseInt(metadata.audioBitrate || '0', 10),
        uploadedAt: metadata.uploadedAt || '',
        sha256: metadata.sha256,
      };
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('BlobNotFound') || err.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(storageKey: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    await blockBlobClient.deleteIfExists();
  }

  /**
   * List all recordings for a user
   */
  async listUserRecordings(userId: string): Promise<string[]> {
    const prefix = `${userId}/`;
    const storageKeys: string[] = [];

    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      storageKeys.push(blob.name);
    }

    return storageKeys;
  }

  /**
   * List all recordings for an application
   */
  async listApplicationRecordings(
    userId: string,
    applicationId: string
  ): Promise<string[]> {
    const prefix = `${userId}/${applicationId}/`;
    const storageKeys: string[] = [];

    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      storageKeys.push(blob.name);
    }

    return storageKeys;
  }

  /**
   * Get recording by session ID
   */
  async getRecordingBySessionId(
    userId: string,
    applicationId: string,
    sessionId: string
  ): Promise<{ storageKey: string; url: string } | null> {
    const extension = '.webm'; // Default extension
    const storageKey = `${userId}/${applicationId}/${sessionId}/recording${extension}`;

    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    try {
      await blockBlobClient.getProperties();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('BlobNotFound') || err.message.includes('404')) {
        return null;
      }
      throw error;
    }

    const url = await this.getSignedUrl(storageKey);
    return { storageKey, url };
  }

  /**
   * Check if recording exists
   */
  async exists(storageKey: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    try {
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('BlobNotFound') || err.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get total storage used by user (in bytes)
   */
  async getUserStorageSize(userId: string): Promise<number> {
    const prefix = `${userId}/`;
    let totalSize = 0;

    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      totalSize += blob.properties.contentLength || 0;
    }

    return totalSize;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'video/webm': '.webm',
      'video/mp4': '.mp4',
      'video/x-matroska': '.mkv',
      'video/quicktime': '.mov',
    };

    return mimeToExt[mimeType] || '.webm';
  }
}
