import type { inferAsyncReturnType } from '@trpc/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/options';
import type { NextAuthOptions } from 'next-auth';

interface CreateCtxOpts {
  req: Request;
}

export async function createContext(_opts?: CreateCtxOpts) {
  // NextAuth getServerSession for App Router expects headers object
  let session: any = null;
  try {
    // Construct minimal req for getServerSession; in App Router we can’t directly pass Node req.
    // Using experimental approach: getServerSession with authOptions (will fall back to cookies).
    session = await getServerSession(authOptions as NextAuthOptions);
  } catch {
    session = null;
  }
  return { session };
}
export type Context = inferAsyncReturnType<typeof createContext>;
