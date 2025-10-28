import { NextResponse } from 'next/server';
import { performRegistration } from '../../../../services/auth/register';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = await performRegistration(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'UNKNOWN', message },
      },
      { status: 500 }
    );
  }
}
