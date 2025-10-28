import { z } from 'zod';
import {
  findUserByEmail,
  findUserById,
} from '../../data-access/repositories/userRepo';
import {
  createPasswordResetToken,
  findValidResetToken,
  consumeResetToken,
} from '../../data-access/repositories/passwordResetRepo';
import type { Result } from '../../shared/result';
import { ok, err } from '../../shared/result';
import { ErrorCodes } from '../../shared/errors';
import * as bcrypt from 'bcryptjs';
import { getEnv } from '../../config/env';
import { sendPasswordResetEmail } from '../email/emailService';
import { isRateLimited } from '../security/rateLimiter';
import { getMongoClient } from '../../data-access/mongoClient';

const env = getEnv();

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>;

export const PasswordPerformSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});
export type PasswordPerformInput = z.infer<typeof PasswordPerformSchema>;

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  opts?: { ip?: string }
): Promise<Result<{ sent: true }, string>> {
  // Rate limit by IP and email combo (basic defense against abuse / enumeration).
  const ipKey = opts?.ip ? `pwdreset:ip:${opts.ip}` : undefined;
  const emailKey = `pwdreset:email:${input.email.toLowerCase()}`;
  const cfg = { limit: 5, windowMs: 60_000 }; // 5 attempts per minute
  const ipLimited = ipKey ? isRateLimited(ipKey, cfg) : false;
  const emailLimited = isRateLimited(emailKey, cfg);
  if (ipLimited || emailLimited) {
    return ok({ sent: true }); // silent fail to avoid enumeration
  }
  const user = await findUserByEmail(input.email.toLowerCase());
  if (!user) {
    // Always respond ok to avoid enumeration
    return ok({ sent: true });
  }
  const { rawToken } = await createPasswordResetToken(
    user._id,
    env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30
  );
  // Fire and forget email (do not reveal failures to caller)
  void sendPasswordResetEmail({
    to: user.email,
    token: rawToken,
    baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  });
  return ok({ sent: true });
}

export async function performPasswordReset(
  input: PasswordPerformInput
): Promise<Result<{ reset: true }, string>> {
  const record = await findValidResetToken(input.token);
  if (!record)
    return err(ErrorCodes.RESET_INVALID_TOKEN, 'Invalid or expired token');
  if (input.newPassword.length < 8)
    return err(ErrorCodes.RESET_WEAK_PASSWORD, 'Password too weak');
  const user = await findUserById(record.userId);
  if (!user) return err(ErrorCodes.RESET_INVALID_TOKEN, 'Invalid token');
  const hash = bcrypt.hashSync(input.newPassword, 10);
  // update user passwordHash
  const client = await getMongoClient();
  const usersCol = client.db().collection<{ _id: string }>('users');
  await usersCol.updateOne(
    { _id: user._id },
    { $set: { passwordHash: hash, updatedAt: new Date().toISOString() } }
  );
  await consumeResetToken(input.token);
  return ok({ reset: true });
}
