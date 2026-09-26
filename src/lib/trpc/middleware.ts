import { TRPCError } from '@trpc/server';

import { AppError } from '../http/app-error.ts';
import { appErrorToTrpc } from './errors.ts';
import { isLimited } from './rate-limit-middleware.ts';
import { publicProcedure, trpc } from './init.ts';

/**
 * tRPC v11 `next()` does not throw on procedure failure — it returns `{ ok: false, error }`.
 * Remap AppError (and known causes like R2ConfigError → 503) so clients get the right code.
 */
const mapAppErrors = trpc.middleware(async ({ next }) => {
  try {
    const result = await next();
    if (!result.ok && result.error.cause) {
      if (result.error.cause instanceof AppError) {
        throw appErrorToTrpc(result.error.cause);
      }
      const mapped = AppError.fromUnknown(result.error.cause);
      if (mapped.code !== 'INTERNAL_SERVER_ERROR') {
        throw appErrorToTrpc(mapped);
      }
    }
    return result;
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw appErrorToTrpc(error);
    }
    throw appErrorToTrpc(AppError.fromUnknown(error));
  }
});

const requireAccessJwt = trpc.middleware(async ({ ctx, next }) => {
  try {
    const identity = await ctx.ensureAccessIdentity();
    return next({
      ctx: {
        ...ctx,
        admin: identity,
        accessIdentity: identity,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Access denied';
    throw new TRPCError({ code: 'FORBIDDEN', message, cause: error });
  }
});

/** Cloudflare Access JWT + AppError mapping — same rules as `/admin/api/health` and tRPC. */
export const adminProcedure = publicProcedure.use(mapAppErrors).use(requireAccessJwt);

/** Admin mutations with per-procedure rate limits (ingest first). */
export const rateLimitedAdminProcedure = adminProcedure.use(isLimited);

export { mapAppErrors as appErrorMiddleware };
