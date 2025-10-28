import { NextResponse } from 'next/server';
import {
  PasswordPerformSchema,
  performPasswordReset,
} from '../../../../../services/auth/passwordReset';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = PasswordPerformSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid payload' } },
        { status: 400 }
      );
    }
    const res = await performPasswordReset(parsed.data);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: 'Server error' } },
      { status: 500 }
    );
  }
}
