import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/options';
import { findUserByEmail } from '../../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../../data-access/repositories/interviewSessionRepo';
import { AzureBlobInterviewStorage } from '../../../../../services/storage/azureBlobStorage';
import { logger } from '../../../../../monitoring/logger';

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
 * GET /api/interview/recording/[sessionId]
 *
 * Get signed Azure Blob URL for video playback
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const email = await getSessionUserEmail();
    if (!email) {
      logger.warn({ event: 'get_recording_no_auth' });
      return json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        401
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      logger.warn({ event: 'get_recording_user_not_found', email });
      return json(
        {
          ok: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    const { sessionId } = await params;

    // Get expiry duration from query params (default 1 hour)
    const { searchParams } = new URL(req.url);
    const expiryMinutes = parseInt(
      searchParams.get('expiryMinutes') || '60',
      10
    );

    logger.info({
      event: 'get_recording_fetching',
      userId: user._id,
      sessionId,
      expiryMinutes,
    });

    // Fetch session to verify ownership
    const session = await interviewSessionRepo.findBySessionId(sessionId);

    if (!session) {
      logger.warn({ event: 'get_recording_session_not_found', sessionId });
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
        event: 'get_recording_unauthorized',
        sessionId,
        userId: user._id,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to access this recording',
          },
        },
        403
      );
    }

    // Check if recording exists
    if (!session.videoRecordingUrl) {
      logger.warn({ event: 'get_recording_not_available', sessionId });
      return json(
        {
          ok: false,
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not available for this session',
          },
        },
        404
      );
    }

    // Initialize Azure storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      logger.error({ event: 'get_recording_missing_storage_config' });
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

    // Get recording by session ID
    const recording = await storage.getRecordingBySessionId(
      user._id,
      session.applicationId,
      sessionId
    );

    if (!recording) {
      logger.warn({
        event: 'get_recording_file_not_found',
        sessionId,
        userId: user._id,
      });
      return json(
        {
          ok: false,
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording file not found in storage',
          },
        },
        404
      );
    }

    // Generate fresh signed URL with custom expiry
    const signedUrl = await storage.getSignedUrl(
      recording.storageKey,
      expiryMinutes
    );

    logger.info({
      event: 'get_recording_success',
      userId: user._id,
      sessionId,
    });

    return json({
      ok: true,
      value: {
        url: signedUrl,
        storageKey: recording.storageKey,
        expiresIn: expiryMinutes * 60, // seconds
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event: 'get_recording_error', error: message });
    return json({ ok: false, error: { code: 'SERVER_ERROR', message } }, 500);
  }
}
