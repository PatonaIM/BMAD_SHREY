import { NextResponse } from 'next/server';
import {
  PasswordResetRequestSchema,
  requestPasswordReset,
} from '../../../../../services/auth/passwordReset';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = PasswordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid email' } },
        { status: 400 }
      );
    }
    const res = await requestPasswordReset(parsed.data);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: 'Server error' } },
      { status: 500 }
    );
  }
}
