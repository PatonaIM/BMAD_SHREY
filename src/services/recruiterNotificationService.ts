/**
 * Recruiter Notification Service
 * Coordinates multi-channel notifications (Google Chat + Email) for recruiter updates
 * Always sends email as primary notification, Google Chat as supplementary
 */

import { logger } from '../monitoring/logger';
import { googleChatService } from './googleChatService';
import type { Application } from '../shared/types/application';
import type { JobSubscription } from '../data-access/repositories/recruiterSubscriptionRepo';

export interface NotificationContext {
  application: Application;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  interviewScore?: number;
  detailedFeedback?: {
    strengths: string[];
    improvements: string[];
    summary: string;
  };
}

/**
 * RecruiterNotificationService - Multi-channel notifications for recruiters
 */
export class RecruiterNotificationService {
  /**
   * Notify a recruiter about an interview completion
   * Tries Google Chat first (if enabled), always sends email
   */
  async notifyInterviewCompleted(
    subscription: JobSubscription,
    context: NotificationContext
  ): Promise<void> {
    const {
      application,
      jobTitle,
      candidateName,
      interviewScore,
      detailedFeedback,
    } = context;

    if (!interviewScore) {
      logger.warn({
        event: 'interview_notification_missing_score',
        applicationId: application._id,
      });
      return;
    }

    logger.info({
      event: 'recruiter_interview_notification_start',
      recruiterId: subscription.recruiterId,
      applicationId: application._id,
      jobId: application.jobId,
      interviewScore,
    });

    // Try Google Chat notification if enabled
    if (googleChatService.isEnabled()) {
      logger.info({
        event: 'google_chat_attempting_interview_notification',
        applicationId: application._id,
        interviewScore,
      });

      const chatResult = await googleChatService.notifyInterviewCompleted(
        application,
        jobTitle,
        candidateName,
        interviewScore,
        detailedFeedback
      );

      if (chatResult.success) {
        logger.info({
          event: 'google_chat_interview_notification_success',
          applicationId: application._id,
        });
      } else {
        logger.warn({
          event: 'google_chat_interview_notification_failed',
          applicationId: application._id,
          error: chatResult.error,
          message: 'Continuing with email notification',
        });
      }
    } else {
      logger.warn({
        event: 'google_chat_disabled',
        reason: 'Integration not enabled',
        isEnabled: googleChatService.isEnabled(),
        webhookConfigured: !!process.env.GOOGLE_CHAT_WEBHOOK_URL,
        enabledEnvVar: process.env.GOOGLE_CHAT_ENABLED,
      });
    }

    // Always send email notification (primary channel)
    await this.sendEmailNotification(subscription, context, 'interview');
  }

  /**
   * Notify a recruiter about a new application
   * Tries Google Chat first (if enabled), always sends email
   */
  async notifyNewApplication(
    subscription: JobSubscription,
    context: NotificationContext
  ): Promise<void> {
    const { application, jobTitle, candidateName } = context;

    logger.info({
      event: 'recruiter_notification_start',
      recruiterId: subscription.recruiterId,
      applicationId: application._id,
      jobId: application.jobId,
    });

    // Try Google Chat notification if enabled
    if (googleChatService.isEnabled()) {
      const chatResult = await googleChatService.notifyNewApplication(
        application,
        jobTitle,
        candidateName
      );

      if (chatResult.success) {
        logger.info({
          event: 'google_chat_notification_success',
          applicationId: application._id,
        });
      } else {
        // Log but don't fail - email is primary channel
        logger.warn({
          event: 'google_chat_notification_failed',
          applicationId: application._id,
          error: chatResult.error,
          message: 'Continuing with email notification',
        });
      }
    } else {
      logger.debug({
        event: 'google_chat_skipped',
        reason: 'Integration not enabled',
      });
    }

    // Always send email notification (primary channel)
    await this.sendEmailNotification(subscription, context, 'application');
  }

  /**
   * Send email notification to recruiter
   * Uses existing email service infrastructure
   */
  private async sendEmailNotification(
    subscription: JobSubscription,
    context: NotificationContext,
    type: 'application' | 'interview' = 'application'
  ): Promise<void> {
    const {
      application,
      jobTitle,
      candidateName,
      candidateEmail,
      interviewScore,
      detailedFeedback,
    } = context;

    try {
      const subject =
        type === 'interview'
          ? `AI Interview completed for ${jobTitle}`
          : `New application for ${jobTitle}`;

      // For now, log email details
      // TODO: Integrate with actual email service when available
      // Need to fetch recruiter email from users collection using recruiterId
      logger.info({
        event: 'email_notification_sent',
        recruiterId: subscription.recruiterId,
        subject,
        applicationId: application._id,
        type,
      });

      if (process.env.NODE_ENV !== 'production') {
        const debugData: Record<string, unknown> = {
          event: 'email_notification_preview',
          recruiterId: subscription.recruiterId,
          subject,
          candidateName,
          candidateEmail,
          matchScore: application.matchScore || 0,
          applicationLink: `${process.env.NEXT_PUBLIC_URL}/recruiter/applications/${application._id}`,
          type,
        };

        if (type === 'interview' && interviewScore) {
          debugData.interviewScore = interviewScore;
          debugData.interviewLink = `${process.env.NEXT_PUBLIC_URL}/recruiter/interviews/${application._id}`;
          if (detailedFeedback) {
            debugData.feedback = detailedFeedback;
          }
        }

        logger.debug(debugData);
      }
    } catch (err) {
      logger.error({
        event: 'email_notification_failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        recruiterId: subscription.recruiterId,
        applicationId: application._id,
        type,
      });
      throw err; // Email is critical, so throw on failure
    }
  }

  /**
   * Notify all subscribed recruiters about an interview completion
   */
  async notifySubscribedRecruitersInterviewComplete(
    subscriptions: JobSubscription[],
    context: NotificationContext
  ): Promise<void> {
    if (subscriptions.length === 0) {
      logger.warn({
        event: 'no_subscriptions_found',
        jobId: context.application.jobId,
        message: 'No recruiters subscribed to this job',
      });
      return;
    }

    logger.info({
      event: 'notifying_subscribers_interview',
      count: subscriptions.length,
      jobId: context.application.jobId,
    });

    // Send notifications in parallel (but email errors will throw)
    await Promise.all(
      subscriptions.map(sub => this.notifyInterviewCompleted(sub, context))
    );

    logger.info({
      event: 'all_interview_notifications_sent',
      count: subscriptions.length,
      applicationId: context.application._id,
    });
  }

  /**
   * Notify all subscribed recruiters about a new application
   */
  async notifySubscribedRecruiters(
    subscriptions: JobSubscription[],
    context: NotificationContext
  ): Promise<void> {
    if (subscriptions.length === 0) {
      logger.warn({
        event: 'no_subscriptions_found',
        jobId: context.application.jobId,
        message: 'No recruiters subscribed to this job',
      });
      return;
    }

    logger.info({
      event: 'notifying_subscribers',
      count: subscriptions.length,
      jobId: context.application.jobId,
    });

    // Send notifications in parallel (but email errors will throw)
    await Promise.all(
      subscriptions.map(sub => this.notifyNewApplication(sub, context))
    );

    logger.info({
      event: 'all_notifications_sent',
      count: subscriptions.length,
      applicationId: context.application._id,
    });
  }
}

// Singleton instance
export const recruiterNotificationService = new RecruiterNotificationService();
