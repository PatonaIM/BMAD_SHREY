/**
 * Google Calendar Service
 * Integrates with Google Calendar API for scheduling interviews
 * Only recruiters with linked calendars can schedule
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../monitoring/logger';

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[]; // email addresses
  meetLink?: string;
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
  status: 'free' | 'busy';
}

export interface CalendarServiceResult {
  success: boolean;
  data?: {
    eventId?: string;
    meetLink?: string;
    slots?: FreeBusySlot[];
  };
  error?: string;
}

/**
 * GoogleCalendarService - OAuth-based calendar integration
 */
export class GoogleCalendarService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri =
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      'http://localhost:3000/api/auth/callback/google';

    if (!this.clientId || !this.clientSecret) {
      logger.warn({
        event: 'google_calendar_misconfigured',
        message: 'Google OAuth credentials not set',
      });
    }
  }

  /**
   * Create OAuth2 client for a recruiter
   * Tokens should be stored in users.recruiterMetadata.googleCalendar
   */
  private async getOAuthClient(
    accessToken: string,
    refreshToken?: string
  ): Promise<OAuth2Client> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Auto-refresh tokens if needed
    oauth2Client.on('tokens', tokens => {
      if (tokens.refresh_token) {
        logger.info({
          event: 'google_calendar_token_refreshed',
          hasRefreshToken: !!tokens.refresh_token,
        });
      }
    });

    return oauth2Client;
  }

  /**
   * Create a calendar event with Google Meet link
   */
  async createEvent(
    accessToken: string,
    event: CalendarEvent,
    refreshToken?: string
  ): Promise<CalendarServiceResult> {
    try {
      const auth = await this.getOAuthClient(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      const calendarEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: event.attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 min before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send email invites to attendees
      });

      logger.info({
        event: 'google_calendar_event_created',
        eventId: response.data.id,
        hasMeetLink: !!response.data.hangoutLink,
      });

      return {
        success: true,
        data: {
          eventId: response.data.id!,
          meetLink:
            response.data.hangoutLink || response.data.htmlLink || undefined,
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        event: 'google_calendar_event_creation_failed',
        error,
      });

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Fetch free/busy information for a calendar
   */
  async getFreeBusy(
    accessToken: string,
    startDate: Date,
    endDate: Date,
    refreshToken?: string
  ): Promise<CalendarServiceResult> {
    try {
      const auth = await this.getOAuthClient(accessToken, refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots =
        response.data.calendars?.primary?.busy?.map(slot => ({
          start: new Date(slot.start!),
          end: new Date(slot.end!),
          status: 'busy' as const,
        })) || [];

      logger.info({
        event: 'google_calendar_freebusy_fetched',
        busySlotCount: busySlots.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });

      return {
        success: true,
        data: { slots: busySlots },
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      logger.error({
        event: 'google_calendar_freebusy_failed',
        error,
      });

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Check if calendar integration is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService();
