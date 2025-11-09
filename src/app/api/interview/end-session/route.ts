import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { interviewSessionRepo } from '../../../../data-access/repositories/interviewSessionRepo';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { recruiterSubscriptionRepo } from '../../../../data-access/repositories/recruiterSubscriptionRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { AzureBlobInterviewStorage } from '../../../../services/storage/azureBlobStorage';
import { logger } from '../../../../monitoring/logger';
import { recruiterNotificationService } from '../../../../services/recruiterNotificationService';
import { stageService } from '../../../../services/stageService';
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
 *    - detailedFeedback?: { strengths: string[], improvements: string[], summary: string } (EP5-S21)
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
        detailedFeedback,
      } = body;

      logger.info({
        event: 'end_session_request_received',
        sessionId,
        finalScore,
        hasVideoUrl: !!videoUrl,
        hasDetailedFeedback: !!detailedFeedback,
        detailedFeedbackKeys: detailedFeedback
          ? Object.keys(detailedFeedback)
          : [],
      });

      if (!sessionId) {
        return json(
          {
            ok: false,
            error: { code: 'INVALID_REQUEST', message: 'sessionId required' },
          },
          400
        );
      }

      // Validate detailedFeedback if provided (EP5-S21)
      if (detailedFeedback) {
        if (
          !Array.isArray(detailedFeedback.strengths) ||
          !Array.isArray(detailedFeedback.improvements) ||
          typeof detailedFeedback.summary !== 'string'
        ) {
          return json(
            {
              ok: false,
              error: {
                code: 'INVALID_REQUEST',
                message:
                  'detailedFeedback must have strengths[], improvements[], and summary string',
              },
            },
            400
          );
        }
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

      // Map finalScore and scoreBreakdown to the scores structure (for backward compatibility)
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
          finalScore, // EP5-S21: Store as top-level field
          scoreBreakdown, // EP5-S21: Store as top-level field
          videoRecordingUrl: videoUrl ?? session.videoRecordingUrl,
          detailedFeedback, // EP5-S21: Store detailed feedback
          metadata: {
            ...session.metadata,
            endedBy: endedBy || 'candidate',
            reason: reason || 'user_requested',
          },
        }
      );

      logger.info({
        event: 'interview_session_updated',
        sessionId,
        hasDetailedFeedback: !!detailedFeedback,
        detailedFeedback: detailedFeedback
          ? {
              strengthsCount: detailedFeedback.strengths?.length || 0,
              improvementsCount: detailedFeedback.improvements?.length || 0,
              hasSummary: !!detailedFeedback.summary,
            }
          : null,
      });

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

        // Update AI interview stage to completed with interview data
        try {
          logger.info({
            event: 'ai_interview_stage_update_start',
            applicationId: session.applicationId,
            sessionId,
            finalScore,
            hasDetailedFeedback: !!detailedFeedback,
          });

          const aiInterviewStages = await stageService.getStagesByType(
            session.applicationId,
            'ai_interview'
          );

          logger.info({
            event: 'ai_interview_stages_fetched',
            applicationId: session.applicationId,
            stagesFound: aiInterviewStages.length,
            stages: aiInterviewStages.map(s => ({
              id: s.id,
              status: s.status,
              type: s.type,
            })),
          });

          if (aiInterviewStages.length > 0) {
            const aiStage = aiInterviewStages[0];

            if (aiStage) {
              // Prepare stage data with all interview completion information
              const stageData: {
                type: 'ai_interview';
                interviewSessionId: string;
                interviewScore?: number;
                interviewCompletedAt: Date;
                videoUrl?: string;
                detailedFeedback?: {
                  strengths: string[];
                  improvements: string[];
                  summary: string;
                };
              } = {
                type: 'ai_interview',
                interviewSessionId: sessionId,
                interviewScore: finalScore,
                interviewCompletedAt: completedAt,
                videoUrl: videoUrl || undefined,
              };

              // Add detailed feedback if provided
              if (detailedFeedback) {
                stageData.detailedFeedback = {
                  strengths: detailedFeedback.strengths || [],
                  improvements: detailedFeedback.improvements || [],
                  summary: detailedFeedback.summary || '',
                };
              }

              logger.info({
                event: 'ai_interview_stage_data_prepared',
                stageId: aiStage.id,
                stageData: {
                  ...stageData,
                  interviewCompletedAt:
                    stageData.interviewCompletedAt.toISOString(),
                },
              });

              // Add interview completion data to stage
              await stageService.addStageData(aiStage.id, stageData, user._id);

              logger.info({
                event: 'ai_interview_stage_data_added',
                stageId: aiStage.id,
              });

              // Update stage status to completed
              await stageService.updateStageStatus(
                aiStage.id,
                'completed',
                user._id
              );

              logger.info({
                event: 'ai_interview_stage_updated',
                applicationId: session.applicationId,
                stageId: aiStage.id,
                interviewScore: finalScore,
                hasDetailedFeedback: !!detailedFeedback,
              });
            } else {
              logger.warn({
                event: 'ai_interview_stage_null',
                applicationId: session.applicationId,
              });
            }
          } else {
            logger.warn({
              event: 'ai_interview_stage_not_found',
              applicationId: session.applicationId,
            });
          }
        } catch (error) {
          logger.error({
            event: 'ai_interview_stage_update_failed',
            applicationId: session.applicationId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Don't fail the request if stage update fails
        }

        // Notify recruiters about interview completion
        if (application && finalScore !== undefined) {
          setImmediate(async () => {
            try {
              const jobId = application.jobId;
              const subscriptions =
                await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(
                  jobId
                );

              if (subscriptions.length > 0) {
                // Fetch job details for notification
                const job = await jobRepo.findById(jobId);

                if (job) {
                  const candidateEmail = user.email || 'candidate@example.com';
                  const candidateName =
                    candidateEmail.split('@')[0] || 'Candidate';

                  await recruiterNotificationService.notifySubscribedRecruitersInterviewComplete(
                    subscriptions,
                    {
                      application: {
                        ...application,
                        matchScore: application.matchScore || 0,
                      },
                      jobTitle: job.title,
                      candidateName,
                      candidateEmail,
                      interviewScore: finalScore,
                      detailedFeedback,
                    }
                  );

                  logger.info({
                    event: 'interview_complete_notifications_sent',
                    applicationId: session.applicationId,
                    subscriberCount: subscriptions.length,
                  });
                }
              }
            } catch (notificationError) {
              logger.error({
                event: 'interview_notification_error',
                error:
                  notificationError instanceof Error
                    ? notificationError.message
                    : 'Unknown error',
                applicationId: session.applicationId,
              });
            }
          });
        }
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
