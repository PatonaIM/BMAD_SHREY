import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { AzureBlobInterviewStorage } from '../../../../services/storage/azureBlobStorage';
import { logger } from '../../../../monitoring/logger';

interface SessionUser {
  email?: string;
}

interface SafeSession {
  user?: SessionUser;
}

function json(result: unknown, status = 200) {
  return NextResponse.json(result, { status });
}

async function getSessionUserEmail(): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as SafeSession | null;
  return session?.user?.email || null;
}

/**
 * POST /api/interview/upload-chunk
 *
 * Upload a chunk of video recording to Azure Blob Storage using block IDs
 *
 * Body (FormData):
 * - chunk: Blob (video chunk)
 * - sessionId: string
 * - blockId: string (base64 encoded block identifier)
 * - isFirst: 'true' | 'false' (whether this is the first chunk)
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    // Parse FormData
    const formData = await req.formData();
    const chunkFile = formData.get('chunk') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;
    const blockId = formData.get('blockId') as string | null;
    const isFirst = formData.get('isFirst') === 'true';

    // Validate required fields
    if (!sessionId || !blockId || !chunkFile) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId, blockId, and chunk are required',
          },
        },
        400
      );
    }

    // Fetch the interview session
    const session = await interviewSessionRepo.findBySessionId(sessionId);
    if (!session) {
      return json(
        {
          ok: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        },
        404
      );
    }

    // Verify the session belongs to the user
    if (session.userId !== user._id) {
      return json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to upload for this session',
          },
        },
        403
      );
    }

    // Initialize Azure storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      logger.error({ event: 'upload_chunk_missing_storage_config' });
      return json(
        {
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Storage not configured',
          },
        },
        500
      );
    }

    const storage = new AzureBlobInterviewStorage(connectionString);
    await storage.initialize();

    // Upload chunk
    const blobName = `${user._id}/${session.applicationId}/${sessionId}/recording.webm`;
    await storage.uploadChunk(blobName, chunkFile, blockId);

    logger.info({
      event: 'upload_chunk_success',
      sessionId,
      blockId,
      chunkSize: chunkFile.size,
      isFirst,
    });

    return json({
      ok: true,
      value: {
        blockId,
        uploaded: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'upload_chunk_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
