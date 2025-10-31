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
 * POST /api/interview/end-session
 *
 * Finalize interview session and upload recording
 *
 * Body:
 * - sessionId: string (interview session ID)
 * - duration: number (actual duration in milliseconds)
 * - recording: base64 encoded video blob
 * - metadata: InterviewSessionMetadata
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'end_session_no_session' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'end_session_user_not_found', email });
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    const body = await req.json();
    const { sessionId, duration, recording, metadata } = body;

    // Validate required fields
    if (!sessionId || duration === undefined || !recording) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId, duration, and recording are required',
          },
        },
        400
      );
    }

    logger.info({
      event: 'end_session_processing',
      userId: user._id,
      sessionId,
      duration,
    });

    // Fetch the interview session to get job and application IDs
    const session = await interviewSessionRepo.findBySessionId(sessionId);
    if (!session) {
      logger.warn({ event: 'end_session_not_found', sessionId });
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
      logger.warn({
        event: 'end_session_unauthorized',
        sessionId,
        userId: user._id,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to end this session',
          },
        },
        403
      );
    }

    // Convert base64 recording to Blob
    const recordingData = recording.split(',')[1] || recording;
    const buffer = Buffer.from(recordingData, 'base64');
    const blob = new Blob([buffer], {
      type: metadata?.videoFormat || 'video/webm',
    });

    // Initialize Azure storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      logger.error({ event: 'end_session_missing_storage_config' });
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

    // Upload recording
    const uploadResult = await storage.uploadRecording(
      sessionId,
      user._id,
      session.applicationId,
      blob,
      {
        duration,
        fileSize: blob.size,
        mimeType: metadata?.videoFormat || 'video/webm',
        videoResolution: metadata?.videoResolution || '1280x720',
        frameRate: metadata?.frameRate || 30,
        videoBitrate: 2500000,
        audioBitrate: 128000,
      }
    );

    logger.info({
      event: 'end_session_video_uploaded',
      sessionId,
      storageKey: uploadResult.storageKey,
      fileSize: blob.size,
    });

    // Update session with completion status
    const updateSuccess = await interviewSessionRepo.markCompleted(
      sessionId,
      uploadResult.url,
      duration,
      metadata as InterviewSessionMetadata
    );

    if (!updateSuccess) {
      logger.error({ event: 'end_session_update_failed', sessionId });
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
      event: 'end_session_success',
      userId: user._id,
      sessionId,
      duration,
    });

    return json({
      ok: true,
      value: {
        sessionId: updatedSession?.sessionId || sessionId,
        status: updatedSession?.status || 'completed',
        videoUrl: updatedSession?.videoRecordingUrl || uploadResult.url,
        duration: updatedSession?.duration || duration,
        completedAt: updatedSession?.endedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'end_session_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
