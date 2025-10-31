import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getEnv } from '../../config/env';
import { logger } from '../../monitoring/logger';
import { AzureBlobResumeStorage } from './azureBlobStorage';

export interface StoredFileInfo {
  storageKey: string; // path on disk relative to base or blob path in Azure
  sha256: string;
  bytes: number;
  mimeType: string;
}

export interface ResumeStorage {
  store(
    _userId: string,
    _fileName: string,
    _mimeType: string,
    _data: Buffer
  ): Promise<StoredFileInfo>;
  getViewUrl(_storageKey: string): Promise<string>;
  get(_storageKey: string): Promise<Buffer>;
  delete?(_storageKey: string): Promise<void>;
  listUserResumes?(_userId: string): Promise<string[]>;
}

const BASE_DIR = join(process.cwd(), 'data', 'resumes');

function ensureBase() {
  mkdirSync(BASE_DIR, { recursive: true });
}

export class LocalFsResumeStorage implements ResumeStorage {
  async store(
    userId: string,
    fileName: string,
    mimeType: string,
    data: Buffer
  ): Promise<StoredFileInfo> {
    ensureBase();
    const hash = createHash('sha256').update(data).digest('hex');
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = join(userId, `${Date.now()}-${safeName}`);
    const fullPath = join(BASE_DIR, storageKey);
    mkdirSync(join(BASE_DIR, userId), { recursive: true });
    writeFileSync(fullPath, data);
    return {
      storageKey,
      sha256: hash,
      bytes: data.length,
      mimeType,
    };
  }

  async getViewUrl(storageKey: string): Promise<string> {
    // Return URL to our API route that will serve the file
    const encodedKey = encodeURIComponent(storageKey);
    return `/api/resume/view/${encodedKey}`;
  }

  async get(storageKey: string): Promise<Buffer> {
    const { readFileSync, existsSync } = await import('fs');
    const fullPath = join(BASE_DIR, storageKey);

    if (!existsSync(fullPath)) {
      throw new Error(`Resume file not found: ${storageKey}`);
    }

    return readFileSync(fullPath);
  }
}

let singleton: ResumeStorage | undefined;

export async function initializeStorage(): Promise<ResumeStorage> {
  const env = getEnv();
  const useAzure = env.USE_AZURE_STORAGE === true;

  if (useAzure) {
    try {
      if (!env.AZURE_STORAGE_CONNECTION_STRING) {
        logger.warn({
          event: 'storage_config_warn',
          message:
            'USE_AZURE_STORAGE is true but AZURE_STORAGE_CONNECTION_STRING is not set. Falling back to local storage.',
        });
        return new LocalFsResumeStorage();
      }

      const containerName = env.AZURE_STORAGE_CONTAINER_NAME || 'resumes';
      const storage = new AzureBlobResumeStorage(
        env.AZURE_STORAGE_CONNECTION_STRING,
        containerName
      );

      logger.info({
        event: 'storage_initialized',
        provider: 'azure',
        container: containerName,
      });

      return storage;
    } catch (error) {
      logger.error({
        event: 'storage_init_error',
        provider: 'azure',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.warn({
        event: 'storage_fallback',
        message: 'Falling back to local file storage',
      });
      return new LocalFsResumeStorage();
    }
  } else {
    logger.info({
      event: 'storage_initialized',
      provider: 'local',
    });
    return new LocalFsResumeStorage();
  }
}

export function getResumeStorage(): ResumeStorage {
  if (!singleton) {
    // Synchronous fallback - use local storage if not initialized
    singleton = new LocalFsResumeStorage();
    logger.info({
      event: 'storage_sync_init',
      provider: 'local',
      message: 'Initialized local storage synchronously',
    });
  }
  return singleton;
}

export async function getResumeStorageAsync(): Promise<ResumeStorage> {
  if (!singleton) {
    singleton = await initializeStorage();
  }
  return singleton;
}
