import { TRPCError } from '@trpc/server';

export function requireRole(
  roles: string[],
  userRoles: string[] | undefined
): void {
  if (!userRoles) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No session' });
  }
  const has = roles.some(r => userRoles.includes(r));
  if (!has) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient role' });
  }
}
