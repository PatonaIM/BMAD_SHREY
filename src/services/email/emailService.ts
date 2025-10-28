import { getEnv } from '../../config/env';
import { Resend } from 'resend';

const env = getEnv();
let resend: Resend | null = null;
if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY);
}

// Use configurable from, fallback to Resend onboarding address (allowed for dev), else last resort local.
const FROM_ADDRESS = env.RESEND_FROM || 'onboarding@resend.dev';

export interface PasswordResetEmailParams {
  to: string;
  token: string;
  baseUrl: string; // e.g. NEXTAUTH_URL or public app URL
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<{ sent: boolean }> {
  const { to, token, baseUrl } = params;
  if (!resend) {
    console.log(
      '[email:fallback:no-resend] password reset token (no API key)',
      {
        to,
        token,
      }
    );
    return { sent: false };
  }
  const resetLink = `${baseUrl}/password-reset?token=${encodeURIComponent(
    token
  )}`;
  try {
    const result: unknown = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Your password reset link',
      html: `<p>Use the link below to reset your password. If you did not request this, ignore this email.</p>
<p><a href="${resetLink}">${resetLink}</a></p>
<p>Or copy this token into the reset form: <code>${token}</code></p>`,
    });
    console.log(result);
    if (process.env.NODE_ENV !== 'production') {
      const maybe = result as { id?: string } | undefined;
      console.log('[email:dev] password reset sent (or queued)', {
        to,
        id: maybe?.id,
        link: resetLink,
      });
    }
    return { sent: true };
  } catch (e) {
    console.error('[email:error] Failed to send reset email', {
      error: e,
      to,
      from: FROM_ADDRESS,
      haveKey: !!env.RESEND_API_KEY,
      token: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
    return { sent: false };
  }
}
