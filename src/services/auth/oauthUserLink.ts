import {
  findUserByEmail,
  createUser,
  anyAdminExists,
  ensureUserEmailUniqueIndex,
} from '../../data-access/repositories/userRepo';
import { getEnv } from '../../config/env';
import { logger } from '../../monitoring/logger';

export interface OAuthNormalizedProfile {
  email?: string | null;
  name?: string | null;
  provider: 'google' | 'github';
  providerId: string; // provider-specific unique id
}

export interface OAuthLinkResult {
  userId: string;
  roles: string[];
  newUser: boolean;
  elevated: boolean;
}

export async function linkOrCreateOAuthUser(
  profile: OAuthNormalizedProfile
): Promise<
  OAuthLinkResult | { error: 'missing_email' } | { error: 'internal' }
> {
  if (!profile.email) {
    return { error: 'missing_email' };
  }
  await ensureUserEmailUniqueIndex();
  const emailLower = profile.email.toLowerCase();
  const existing = await findUserByEmail(emailLower);
  if (existing) {
    logger.info({
      event: 'auth_login_provider',
      provider: profile.provider,
      userId: existing._id.slice(0, 8),
      roles: existing.roles,
      newUser: false,
    });
    return {
      userId: existing._id,
      roles: existing.roles,
      newUser: false,
      elevated: false,
    };
  }
  try {
    const env = getEnv();
    let roles = ['USER'];
    let elevated = false;

    // Check if email domain is teamified.com for recruiter role assignment
    const emailDomain = emailLower.split('@')[1];
    if (emailDomain === 'teamified.com') {
      roles = ['RECRUITER'];
      logger.info({
        event: 'auth_oauth_recruiter_assigned',
        provider: profile.provider,
        email: emailLower,
        reason: 'teamified_domain',
      });
    } else if (env.AUTO_ELEVATE_FIRST_OAUTH_ADMIN) {
      const exists = await anyAdminExists();
      if (!exists) {
        roles = ['ADMIN'];
        elevated = true;
      }
    }
    const created = await createUser({
      email: emailLower,
      roles,
    });
    logger.info({
      event: 'auth_login_provider',
      provider: profile.provider,
      userId: created._id.slice(0, 8),
      roles,
      newUser: true,
      elevated,
    });
    return { userId: created._id, roles, newUser: true, elevated };
  } catch (e) {
    logger.error({
      event: 'auth_login_provider_error',
      provider: profile.provider,
      message: (e as Error).message,
    });
    return { error: 'internal' };
  }
}
