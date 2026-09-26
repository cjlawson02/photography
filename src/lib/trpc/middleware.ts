import { TRPCError } from '@trpc/server';

import { verifyAccessJwt } from '../access/verify-jwt.ts';
import { AppError } from '../http/app-error.ts';
import { appErrorToTrpc } from './errors.ts';
import { publicProcedure, trpc } from './init.ts';

const mapAppErrors = trpc.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof AppError) {
			throw appErrorToTrpc(error);
		}
		if (error instanceof TRPCError) {
			throw error;
		}
		throw appErrorToTrpc(AppError.fromUnknown(error));
	}
});

const requireAccessJwt = trpc.middleware(async ({ ctx, next }) => {
	if (ctx.accessIdentity) {
		return next({
			ctx: {
				...ctx,
				admin: ctx.accessIdentity,
			},
		});
	}
	try {
		const identity = await verifyAccessJwt(ctx.request, ctx.accessEnv);
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

export { mapAppErrors as appErrorMiddleware };
