import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/options';
import { validateResume } from '../../../../../services/profile/resumeValidation';
import { getResumeStorage } from '../../../../../services/storage/resumeStorage';
import { upsertResumeVersion } from '../../../../../data-access/repositories/resumeRepo';
import { ErrorCodes } from '../../../../../shared/errors';

interface SessionUser {
  id: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

export const runtime = 'nodejs';
export const maxDuration = 30; // seconds

export async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptions
  )) as unknown as SafeSession;
  if (!session?.user?.email || !session.user.id) {
    return Response.json(
      {
        ok: false,
        error: {
          code: ErrorCodes.RESUME_UPLOAD_UNAUTHORIZED,
          message: 'Auth required',
        },
      },
      { status: 401 }
    );
  }
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'Missing file' } },
        { status: 400 }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const validation = validateResume(file.name, file.type, buffer.length);
    if (!validation.ok) {
      return Response.json(validation, { status: 400 });
    }
    const storage = getResumeStorage();
    const stored = await storage.store(
      session.user.id,
      file.name,
      file.type,
      buffer
    );
    const doc = await upsertResumeVersion(session.user.id, {
      fileName: file.name,
      fileSize: stored.bytes,
      mimeType: stored.mimeType,
      storageKey: stored.storageKey,
      sha256: stored.sha256,
    });
    return Response.json({
      ok: true,
      value: { currentVersionId: doc.currentVersionId },
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: {
          code: ErrorCodes.RESUME_STORAGE_FAILED,
          message: (e as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
