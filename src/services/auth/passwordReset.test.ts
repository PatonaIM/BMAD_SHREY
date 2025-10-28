import { describe, it, expect } from 'vitest';
import { requestPasswordReset, performPasswordReset } from './passwordReset';
import {
  createUser,
  findUserByEmail,
} from '../../data-access/repositories/userRepo';
import * as bcrypt from 'bcryptjs';
import { createPasswordResetToken } from '../../data-access/repositories/passwordResetRepo';

describe('password reset flow', () => {
  it('request returns ok even if email missing', async () => {
    const res = await requestPasswordReset({ email: 'missing@example.com' });
    expect(res.ok).toBe(true);
  });
  it('request then perform resets password', async () => {
    const user = await createUser({
      email: 'reset@example.com',
      roles: ['USER'],
      passwordHash: bcrypt.hashSync('oldpassword', 10),
    });
    const reqRes = await requestPasswordReset({ email: user.email });
    expect(reqRes.ok).toBe(true);
    // Generate a token directly (simulating email received)
    const { rawToken } = await createPasswordResetToken(user._id, 30);
    const perf = await performPasswordReset({
      token: rawToken,
      newPassword: 'newBetterPass1',
    });
    expect(perf.ok).toBe(true);
    const updated = await findUserByEmail(user.email);
    expect(
      updated?.passwordHash &&
        bcrypt.compareSync('newBetterPass1', updated.passwordHash)
    ).toBe(true);
  });
});
