import { getServerSession } from 'next-auth';
import { authOptions } from './options';
import { findUserByEmail } from '../data-access/repositories/userRepo';

interface SessionUser {
  id?: string;
  email?: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

/**
 * Get the current user's ID from the session.
 * This handles both OAuth and credentials users correctly.
 *
 * For OAuth users: session.user.id should be set from token.sub
 * For credentials users: falls back to looking up user by email
 *
 * @returns userId or null if not authenticated
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as SafeSession | null;

  if (!session?.user?.email) {
    return null;
  }

  // If session.user.id is set, use it (this should be the userId from token.sub)
  if (session.user.id) {
    return session.user.id;
  }

  // Fallback: look up user by email (for old sessions or credentials users)
  const user = await findUserByEmail(session.user.email);
  return user?._id || null;
}

/**
 * Get the current session with user info.
 * @returns session or null if not authenticated
 */
export async function getAuthSession(): Promise<SafeSession | null> {
  const session = (await getServerSession(authOptions)) as SafeSession | null;
  return session;
}

/**
 * Check if the current user is authenticated.
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession();
  return !!session?.user?.email;
}
