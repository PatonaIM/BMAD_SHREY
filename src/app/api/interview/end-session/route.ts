import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
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
 * Body can be either:
 * 1. FormData (legacy - full recording upload):
 *    - recording: Blob (video file)
 *    - sessionId: string
 *    - duration: number (milliseconds)
 *    - videoFormat: string
 *    - videoResolution: string
 *    - frameRate: string
 *
 * 2. JSON (progressive upload - already uploaded via chunks):
 *    - sessionId: string
 *    - endedBy: 'candidate' | 'system' | 'timeout'
 *    - reason: 'user_requested' | 'timeout' | 'error' | 'completed'
 *    - finalScore?: number
 *    - scoreBreakdown?: object
 *    - videoUrl?: string
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

    // Detect content type to determine which flow to use
    const contentType = req.headers.get('content-type') || '';
    const isJsonRequest = contentType.includes('application/json');

    // Handle JSON request (progressive upload flow)
    if (isJsonRequest) {
      const body = await req.json();
      const {
        sessionId,
        endedBy,
        reason,
        finalScore,
        scoreBreakdown,
        videoUrl,
      } = body;

      if (!sessionId) {
        return json(
          {
            ok: false,
            error: { code: 'INVALID_REQUEST', message: 'sessionId required' },
          },
          400
        );
      }

      // Fetch session
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

      if (session.userId !== user._id) {
        return json(
          {
            ok: false,
            error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
          },
          403
        );
      }

      // Calculate duration
      const completedAt = new Date();
      const startedAt = session.startedAt || session.createdAt;
      const duration = Math.floor(
        (completedAt.getTime() - startedAt.getTime()) / 1000
      );

      // Map finalScore and scoreBreakdown to the scores structure
      const scores = finalScore
        ? {
            overall: finalScore,
            ...scoreBreakdown,
          }
        : undefined;

      // Update session with scores and video URL
      const updatedSession = await interviewSessionRepo.updateSession(
        sessionId,
        {
          status: 'completed',
          endedAt: completedAt,
          duration,
          scores,
          videoRecordingUrl: videoUrl ?? session.videoRecordingUrl,
          metadata: {
            ...session.metadata,
            endedBy: endedBy || 'candidate',
            reason: reason || 'user_requested',
          },
        }
      );

      // Calculate and apply score boost to application
      try {
        const application = await applicationRepo.findById(
          session.applicationId
        );

        if (application && finalScore !== undefined) {
          const originalMatchScore = application.matchScore || 0;

          // Calculate score boost (max 15 points, based on interview performance)
          const scoreBoost = Math.min(finalScore * 0.15, 15);
          const newMatchScore = Math.min(originalMatchScore + scoreBoost, 100);

          // Update application with interview completion data
          await applicationRepo.updateInterviewCompletion(
            session.applicationId,
            finalScore,
            originalMatchScore
          );

          logger.info({
            event: 'application_score_boost_applied',
            applicationId: session.applicationId,
            originalScore: originalMatchScore,
            interviewScore: finalScore,
            scoreBoost,
            newScore: newMatchScore,
          });
        }

        // Also update interview status to completed
        await applicationRepo.updateInterviewStatus(
          session.applicationId,
          'completed'
        );

        logger.info({
          event: 'application_interview_status_updated',
          applicationId: session.applicationId,
          status: 'completed',
        });
      } catch (appUpdateError) {
        // Log error but don't fail the request
        logger.error({
          event: 'application_update_failed',
          applicationId: session.applicationId,
          error:
            appUpdateError instanceof Error
              ? appUpdateError.message
              : 'Unknown',
        });
      }

      logger.info({
        event: 'interview_session_ended',
        sessionId,
        userId: user._id,
        endedBy,
        reason,
        duration,
        finalScore,
        hasVideo: !!videoUrl,
      });

      return json({
        ok: true,
        value: {
          sessionId,
          status: 'completed',
          finalScore,
          scoreBreakdown,
          duration,
          videoUrl: updatedSession?.videoRecordingUrl || videoUrl,
        },
      });
    }

    // Handle FormData request (legacy full upload flow)

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
