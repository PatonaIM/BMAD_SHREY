import { err, ok, type Result } from '../../shared/result';
import { ErrorCodes } from '../../shared/errors';

export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function validateResume(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Result<{ fileName: string; mimeType: string; sizeBytes: number }> {
  if (!ALLOWED_MIME.has(mimeType)) {
    return err(ErrorCodes.RESUME_INVALID_TYPE, 'Unsupported file type');
  }
  if (sizeBytes > MAX_RESUME_BYTES) {
    return err(ErrorCodes.RESUME_TOO_LARGE, 'File exceeds 10MB limit');
  }
  return ok({ fileName, mimeType, sizeBytes });
}
