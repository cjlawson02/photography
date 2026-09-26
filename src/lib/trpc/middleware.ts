import { TRPCError } from '@trpc/server';

import { verifyAccessJwt } from '../access/verify-jwt.ts';
import { publicProcedure } from './init.ts';

/** Cloudflare Access JWT — same rules as `/admin/api/*` REST handlers. */
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
	try {
		const identity = await verifyAccessJwt(ctx.request, ctx.accessEnv);
		return next({
			ctx: {
				...ctx,
				admin: identity,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Access denied';
		throw new TRPCError({ code: 'FORBIDDEN', message, cause: error });
	}
});
