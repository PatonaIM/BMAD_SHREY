import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
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
