import type { inferAsyncReturnType } from '@trpc/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/options';
import type { NextAuthOptions } from 'next-auth';

interface CreateCtxOpts {
  req: Request;
}

function extractIp(req?: Request): string | undefined {
  try {
    if (!req) return undefined;
    const xf = req.headers.get('x-forwarded-for');
    if (xf && xf.length > 0) {
      const first = xf.split(',')[0];
      if (first) return first.trim();
    }
    const ip = req.headers.get('x-real-ip');
    return ip || undefined;
  } catch {
    return undefined;
  }
}

export async function createContext(opts?: CreateCtxOpts) {
  // NextAuth getServerSession for App Router expects headers object
  let session: any = null;
  try {
    // Construct minimal req for getServerSession; in App Router we can’t directly pass Node req.
    // Using experimental approach: getServerSession with authOptions (will fall back to cookies).
    session = await getServerSession(authOptions as NextAuthOptions);
  } catch {
    session = null;
  }
  const ip = extractIp(opts?.req);
  return { session, ip };
}
export type Context = inferAsyncReturnType<typeof createContext>;
