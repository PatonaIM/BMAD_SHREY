export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (milliseconds)
  scope: string;
  connectedAt: string; // ISO date string
}

export interface User {
  _id: string;
  email: string;
  roles: string[];
  googleCalendar?: GoogleCalendarTokens; // Optional - only for recruiters who connected Calendar
  createdAt: string;
  updatedAt: string;
}
