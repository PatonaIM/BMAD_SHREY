/**
 * Session Token Utilities
 *
 * Generate and verify JWT tokens for interview sessions.
 * These tokens enable session authentication and future resumption features.
 */

import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';

export interface SessionTokenPayload {
  sessionId: string;
  applicationId: string;
  type: 'interview';
}

/**
 * Generate a JWT token for an interview session
 * @param sessionId - Unique session identifier
 * @param applicationId - Associated application ID
 * @returns JWT token string (expires in 30 minutes)
 */
export function generateSessionToken(
  sessionId: string,
  applicationId: string
): string {
  const { NEXTAUTH_SECRET } = getEnv();

  if (!NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET not configured');
  }

  const payload: SessionTokenPayload = {
    sessionId,
    applicationId,
    type: 'interview',
  };

  return jwt.sign(payload, NEXTAUTH_SECRET, {
    expiresIn: '30m',
  });
}

/**
 * Verify and decode a session token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid/expired
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const { NEXTAUTH_SECRET } = getEnv();

    if (!NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET not configured');
    }

    const decoded = jwt.verify(token, NEXTAUTH_SECRET);

    // Validate payload structure
    if (
      decoded &&
      typeof decoded === 'object' &&
      'type' in decoded &&
      decoded.type === 'interview' &&
      'sessionId' in decoded &&
      typeof decoded.sessionId === 'string' &&
      'applicationId' in decoded &&
      typeof decoded.applicationId === 'string'
    ) {
      return decoded as SessionTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}
