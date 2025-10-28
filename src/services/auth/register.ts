import { err, ok, type Result } from '../../shared/result';
import { ErrorCodes } from '../../shared/errors';
import {
  findUserByEmail,
  createUser,
} from '../../data-access/repositories/userRepo';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

export const RegistrationSchema = z.object({
  email: z.string().email().min(5).max(120),
  password: z.string().min(8).max(128),
});

export type RegistrationInput = z.infer<typeof RegistrationSchema>;

export async function performRegistration(
  input: RegistrationInput
): Promise<Result<{ userId: string }>> {
  const parsed = RegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      ErrorCodes.REGISTER_WEAK_PASSWORD,
      parsed.error.issues.map(i => i.message).join('; ')
    );
  }
  const emailLower = parsed.data.email.toLowerCase();
  const existing = await findUserByEmail(emailLower);
  if (existing) {
    return err(
      ErrorCodes.REGISTER_EMAIL_EXISTS,
      'A user with that email already exists'
    );
  }
  const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
  const user = await createUser({
    email: emailLower,
    roles: ['USER'],
    passwordHash,
  });
  return ok({ userId: user._id });
}
