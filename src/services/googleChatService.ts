/**
 * Google Chat Service
 * Sends notifications to Google Chat workspace via webhook URL
 * Uses default workspace-wide configuration from environment variables
 */

import { logger } from '../monitoring/logger';
import type { Application } from '../shared/types/application';

export interface ChatMessage {
  text?: string;
  cardsV2?: Array<{
    cardId: string;
    card: GoogleChatCard;
  }>;
}

interface GoogleChatCard {
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: Array<{
    header?: string;
    widgets: Array<ChatWidget>;
  }>;
}

interface ChatWidget {
  textParagraph?: {
    text: string;
  };
  buttonList?: {
    buttons: Array<{
      text: string;
      onClick: {
        openLink: {
          url: string;
        };
      };
    }>;
  };
  decoratedText?: {
    topLabel?: string;
    text: string;
    startIcon?: {
      knownIcon?: string;
    };
  };
  divider?: object;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
}

/**
 * GoogleChatService - Send notifications to Google Chat via webhook
 */
export class GoogleChatService {
  private webhookUrl: string;
  private enabled: boolean;
  private baseUrl: string;

  constructor() {
    this.webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || '';
    this.enabled = process.env.GOOGLE_CHAT_ENABLED === 'true';
    this.baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    logger.info({
      event: 'google_chat_service_initialized',
      enabled: this.enabled,
      hasWebhookUrl: !!this.webhookUrl,
      webhookUrlLength: this.webhookUrl.length,
      envVarEnabled: process.env.GOOGLE_CHAT_ENABLED,
    });

    if (this.enabled && !this.webhookUrl) {
      logger.warn({
        event: 'google_chat_misconfigured',
        message:
          'GOOGLE_CHAT_ENABLED is true but GOOGLE_CHAT_WEBHOOK_URL is not set',
      });
      this.enabled = false;
    }
  }

  /**
   * Check if Google Chat integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled && !!this.webhookUrl;
  }

  /**
   * Send notification to Google Chat
   * Uses circuit breaker pattern for graceful failure
   */
  async sendNotification(message: ChatMessage): Promise<NotificationResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Google Chat integration is not enabled',
      };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          event: 'google_chat_webhook_error',
          status: response.status,
          error: errorText,
        });
        return {
          success: false,
          error: `Webhook returned ${response.status}: ${errorText}`,
        };
      }

      logger.info({
        event: 'google_chat_notification_sent',
        status: response.status,
      });

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        event: 'google_chat_notification_failed',
        error,
      });
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Notify about a completed AI interview
   */
  async notifyInterviewCompleted(
    application: Application,
    jobTitle: string,
    candidateName: string,
    interviewScore: number,
    detailedFeedback?: {
      strengths: string[];
      improvements: string[];
      summary: string;
    }
  ): Promise<NotificationResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Google Chat integration not enabled',
      };
    }

    const message = this.buildInterviewCompletedMessage(
      application,
      jobTitle,
      candidateName,
      interviewScore,
      detailedFeedback
    );
    return this.sendNotification(message);
  }

  /**
   * Build Google Chat Card v2 message for interview completion
   */
  private buildInterviewCompletedMessage(
    application: Application,
    jobTitle: string,
    candidateName: string,
    interviewScore: number,
    detailedFeedback?: {
      strengths: string[];
      improvements: string[];
      summary: string;
    }
  ): ChatMessage {
    const matchScore = application.matchScore || 0;
    const scoreBoost = interviewScore * 0.15 > 15 ? 15 : interviewScore * 0.15;
    const originalScore = matchScore - scoreBoost;

    // Color coding for interview score
    let scoreEmoji = '🟢';
    if (interviewScore < 60) {
      scoreEmoji = '🟡';
    } else if (interviewScore < 80) {
      scoreEmoji = '🔵';
    }

    const widgets: Array<ChatWidget> = [
      {
        decoratedText: {
          topLabel: 'Candidate',
          text: candidateName,
          startIcon: { knownIcon: 'PERSON' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Job Position',
          text: jobTitle,
        },
      },
      {
        decoratedText: {
          topLabel: 'Interview Score',
          text: `${scoreEmoji} ${interviewScore}/100`,
        },
      },
      {
        decoratedText: {
          topLabel: 'Original Match Score',
          text: `${Math.round(originalScore)}/100`,
        },
      },
      {
        decoratedText: {
          topLabel: 'New Match Score (with boost)',
          text: `${Math.round(matchScore)}/100`,
        },
      },
    ];

    // Add detailed feedback if provided
    if (detailedFeedback) {
      widgets.push({ divider: {} } as ChatWidget);

      if (detailedFeedback.summary) {
        widgets.push({
          textParagraph: {
            text: `<b>Summary:</b> ${detailedFeedback.summary}`,
          },
        });
      }

      if (detailedFeedback.strengths.length > 0) {
        widgets.push({
          textParagraph: {
            text: `<b>Strengths:</b>\n• ${detailedFeedback.strengths.join('\n• ')}`,
          },
        });
      }

      if (detailedFeedback.improvements.length > 0) {
        widgets.push({
          textParagraph: {
            text: `<b>Areas for Improvement:</b>\n• ${detailedFeedback.improvements.join('\n• ')}`,
          },
        });
      }
    }

    widgets.push(
      { divider: {} },
      {
        buttonList: {
          buttons: [
            {
              text: 'View Application',
              onClick: {
                openLink: {
                  url: `${process.env.NEXT_PUBLIC_URL}/recruiter/applications/${application._id}`,
                },
              },
            },
            {
              text: 'View Interview',
              onClick: {
                openLink: {
                  url: `${process.env.NEXT_PUBLIC_URL}/recruiter/interviews/${application._id}`,
                },
              },
            },
          ],
        },
      }
    );

    return {
      cardsV2: [
        {
          cardId: `interview-${application._id}`,
          card: {
            header: {
              title: '🎤 AI Interview Completed',
              subtitle: `${candidateName} completed interview for ${jobTitle}`,
            },
            sections: [
              {
                widgets,
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Build Google Chat Card v2 message for new application
   */
  private buildApplicationMessage(
    application: Application,
    jobTitle: string,
    candidateName: string
  ): ChatMessage {
    const applicationUrl = `${this.baseUrl}/recruiter/applications/${application._id}`;
    const score = application.matchScore || 0;

    // Color-code based on score (matching frontend badge colors)
    let scoreEmoji = '🟡'; // Amber (default)
    if (score >= 80) {
      scoreEmoji = '🟢'; // Green
    } else if (score >= 60) {
      scoreEmoji = '🔵'; // Blue
    }

    return {
      cardsV2: [
        {
          cardId: `application-${application._id}`,
          card: {
            header: {
              title: '📩 New Application Received',
              subtitle: jobTitle,
            },
            sections: [
              {
                widgets: [
                  {
                    decoratedText: {
                      topLabel: 'Candidate',
                      text: candidateName,
                      startIcon: {
                        knownIcon: 'PERSON',
                      },
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: 'AI Match Score',
                      text: `${scoreEmoji} ${score}%`,
                      startIcon: {
                        knownIcon: 'STAR',
                      },
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: 'Status',
                      text:
                        application.status.charAt(0).toUpperCase() +
                        application.status.slice(1),
                      startIcon: {
                        knownIcon: 'CLOCK',
                      },
                    },
                  },
                ],
              },
              {
                header: 'Quick Actions',
                widgets: [
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: 'View Application',
                          onClick: {
                            openLink: {
                              url: applicationUrl,
                            },
                          },
                        },
                        {
                          text: 'Review All',
                          onClick: {
                            openLink: {
                              url: `${this.baseUrl}/recruiter/jobs/${application.jobId}/applications`,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Send new application notification
   */
  async notifyNewApplication(
    application: Application,
    jobTitle: string,
    candidateName: string
  ): Promise<NotificationResult> {
    const message = this.buildApplicationMessage(
      application,
      jobTitle,
      candidateName
    );
    return this.sendNotification(message);
  }

  /**
   * Notify about a candidate booking a follow-up call
   */
  async notifyCallBooked(
    application: Application,
    candidateName: string,
    candidateEmail: string,
    scheduledAt: Date,
    meetLink: string,
    notes?: string
  ): Promise<NotificationResult> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Google Chat integration not enabled',
      };
    }

    const message = this.buildCallBookedMessage(
      application,
      candidateName,
      candidateEmail,
      scheduledAt,
      meetLink,
      notes
    );
    return this.sendNotification(message);
  }

  /**
   * Build Google Chat Card v2 message for call booking
   */
  private buildCallBookedMessage(
    application: Application,
    candidateName: string,
    candidateEmail: string,
    scheduledAt: Date,
    meetLink: string,
    notes?: string
  ): ChatMessage {
    const applicationUrl = `${this.baseUrl}/recruiter/applications/${application._id}`;
    const matchScore = application.matchScore || 0;
    const interviewScore =
      application.interviewScore || application.aiInterviewScore;

    // Format date and time
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    };
    const formattedDate = scheduledAt.toLocaleDateString('en-US', dateOptions);
    const formattedTime = scheduledAt.toLocaleTimeString('en-US', timeOptions);

    const widgets: Array<ChatWidget> = [
      {
        decoratedText: {
          topLabel: 'Candidate',
          text: candidateName,
          startIcon: { knownIcon: 'PERSON' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Email',
          text: candidateEmail,
          startIcon: { knownIcon: 'EMAIL' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Job',
          text: application.jobTitle,
        },
      },
      { divider: {} },
      {
        decoratedText: {
          topLabel: 'Scheduled Date',
          text: formattedDate,
          startIcon: { knownIcon: 'CALENDAR' },
        },
      },
      {
        decoratedText: {
          topLabel: 'Time',
          text: formattedTime,
          startIcon: { knownIcon: 'CLOCK' },
        },
      },
      { divider: {} },
      {
        decoratedText: {
          topLabel: 'Match Score',
          text: `${Math.round(matchScore)}/100`,
        },
      },
    ];

    if (interviewScore) {
      widgets.push({
        decoratedText: {
          topLabel: 'Interview Score',
          text: `${Math.round(interviewScore)}/100`,
        },
      });
    }

    if (notes) {
      widgets.push(
        { divider: {} },
        {
          textParagraph: {
            text: `<b>Candidate Notes:</b>\n${notes}`,
          },
        }
      );
    }

    widgets.push(
      { divider: {} },
      {
        buttonList: {
          buttons: [
            {
              text: 'Join Meeting',
              onClick: {
                openLink: {
                  url: meetLink,
                },
              },
            },
            {
              text: 'View Application',
              onClick: {
                openLink: {
                  url: applicationUrl,
                },
              },
            },
          ],
        },
      }
    );

    return {
      cardsV2: [
        {
          cardId: `call-booked-${application._id}`,
          card: {
            header: {
              title: '📞 Follow-up Call Scheduled',
              subtitle: `${candidateName} booked a call for ${application.jobTitle}`,
            },
            sections: [
              {
                widgets,
              },
            ],
          },
        },
      ],
    };
  }
}

// Singleton instance
export const googleChatService = new GoogleChatService();
