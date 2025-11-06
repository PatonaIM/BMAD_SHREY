import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { AzureBlobInterviewStorage } from '../../../../services/storage/azureBlobStorage';
import { logger } from '../../../../monitoring/logger';
import type { InterviewSessionMetadata } from '../../../../shared/types/interview';

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
 * POST /api/interview/finalize-upload
 *
 * Finalize chunked upload by committing all blocks
 *
 * Body (JSON):
 * - sessionId: string
 * - blockIds: string[] (array of base64 encoded block IDs in order)
 * - duration: number (milliseconds)
 * - fileSize: number (total bytes)
 * - videoFormat: string
 * - videoResolution: string
 * - frameRate: number
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

    // Parse JSON body
    const body = await req.json();
    const {
      sessionId,
      blockIds,
      duration,
      fileSize,
      videoFormat,
      videoResolution,
    } = body;

    // Validate required fields
    if (
      !sessionId ||
      !blockIds ||
      !Array.isArray(blockIds) ||
      blockIds.length === 0
    ) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId and blockIds array are required',
          },
        },
        400
      );
    }

    logger.info({
      event: 'finalize_upload_processing',
      userId: user._id,
      sessionId,
      blockCount: blockIds.length,
      blockIds: blockIds.slice(0, 10), // Log first 10 block IDs for debugging
      duration,
      fileSize,
    });

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
            message: 'Not authorized to finalize this upload',
          },
        },
        403
      );
    }

    // Initialize Azure storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      logger.error({ event: 'finalize_upload_missing_storage_config' });
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

    // Commit all blocks
    const blobName = `${user._id}/${session.applicationId}/${sessionId}/recording.webm`;
    const url = await storage.commitBlocks(blobName, blockIds, {
      sessionId,
      userId: user._id,
      applicationId: session.applicationId,
      duration,
      fileSize,
    });

    logger.info({
      event: 'finalize_upload_committed',
      sessionId,
      blobName,
      blockCount: blockIds.length,
    });

    // Update session with completion status
    const metadata: InterviewSessionMetadata = {
      videoFormat: videoFormat || 'video/webm',
      audioFormat: 'audio/webm',
      videoResolution: videoResolution || '1280x720',
      fileSize: fileSize || 0,
      transcriptAvailable: false,
      hasWebcam: true,
      hasScreenShare: false,
    };

    const updateSuccess = await interviewSessionRepo.markCompleted(
      sessionId,
      url,
      duration || 0,
      metadata
    );

    if (!updateSuccess) {
      logger.error({ event: 'finalize_upload_update_failed', sessionId });
      return json(
        {
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to update session',
          },
        },
        500
      );
    }

    // Fetch updated session
    const updatedSession =
      await interviewSessionRepo.findBySessionId(sessionId);

    logger.info({
      event: 'finalize_upload_success',
      userId: user._id,
      sessionId,
      duration,
    });

    return json({
      ok: true,
      value: {
        sessionId: updatedSession?.sessionId || sessionId,
        status: updatedSession?.status || 'completed',
        videoUrl: updatedSession?.videoRecordingUrl || url,
        duration: updatedSession?.duration || duration,
        completedAt: updatedSession?.endedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'finalize_upload_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
