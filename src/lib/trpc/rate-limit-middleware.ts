import { TRPCError } from '@trpc/server';

import { hashString } from '../util/hash-string.ts';
import type { TrpcContext } from './context.ts';
import { trpc } from './init.ts';

async function rateLimitIdentifier(ctx: TrpcContext): Promise<string> {
  const identity = ctx.accessIdentity;
  if (identity?.email?.trim()) {
    return identity.email.trim();
  }
  const sub = identity?.payload.sub;
  if (typeof sub === 'string' && sub.trim()) {
    return sub.trim();
  }
  const ip = ctx.request.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
  return await hashString(ip);
}

/** Per-procedure admin tRPC limits (Workers rate-limit binding). */
export const isLimited = trpc.middleware(async ({ ctx, path, next }) => {
  const limiter = ctx.getAdminTrpcRateLimiter();
  if (!limiter) {
    return next();
  }

  const identifier = await rateLimitIdentifier(ctx);
  const { success } = await limiter.limit({ key: `${path}_${identifier}` });
  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please wait a moment and try again.',
    });
  }

  return next();
});
