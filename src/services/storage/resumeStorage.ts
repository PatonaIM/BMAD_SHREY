import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface StoredFileInfo {
  storageKey: string; // path on disk relative to base
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
}

let singleton: ResumeStorage | null = null;
export function getResumeStorage(): ResumeStorage {
  if (!singleton) singleton = new LocalFsResumeStorage();
  return singleton;
}
