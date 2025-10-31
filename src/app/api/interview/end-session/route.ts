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
 * Body (FormData):
 * - recording: Blob (video file)
 * - sessionId: string
 * - duration: number (milliseconds)
 * - videoFormat: string
 * - videoResolution: string
 * - frameRate: string
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

    // Parse FormData
    const formData = await req.formData();
    const recordingFile = formData.get('recording') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;
    const durationStr = formData.get('duration') as string | null;
    const videoFormat = formData.get('videoFormat') as string | null;
    const videoResolution = formData.get('videoResolution') as string | null;
    const frameRateStr = formData.get('frameRate') as string | null;

    // Validate required fields
    if (!sessionId || !durationStr || !recordingFile) {
      return json(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId, duration, and recording file are required',
          },
        },
        400
      );
    }

    const duration = parseInt(durationStr, 10);
    const frameRate = frameRateStr ? parseInt(frameRateStr, 10) : 30;

    logger.info({
      event: 'end_session_processing',
      userId: user._id,
      sessionId,
      duration,
      fileSize: recordingFile.size,
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

    // Upload recording (Blob directly, no conversion needed)
    const uploadResult = await storage.uploadRecording(
      sessionId,
      user._id,
      session.applicationId,
      recordingFile,
      {
        duration,
        fileSize: recordingFile.size,
        mimeType: videoFormat || 'video/webm',
        videoResolution: videoResolution || '1280x720',
        frameRate,
        videoBitrate: 2500000,
        audioBitrate: 128000,
      }
    );

    logger.info({
      event: 'end_session_video_uploaded',
      sessionId,
      storageKey: uploadResult.storageKey,
      fileSize: recordingFile.size,
    });

    // Update session with completion status
    const metadata: InterviewSessionMetadata = {
      videoFormat: videoFormat || 'video/webm',
      audioFormat: 'audio/webm',
      videoResolution: videoResolution || '1280x720',
      fileSize: recordingFile.size,
      transcriptAvailable: false,
      hasWebcam: true,
      hasScreenShare: false,
    };

    const updateSuccess = await interviewSessionRepo.markCompleted(
      sessionId,
      uploadResult.url,
      duration,
      metadata
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
