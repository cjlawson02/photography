import { initTRPC, TRPCError } from '@trpc/server';

import type { TrpcContext } from './context.ts';

const t = initTRPC.context<TrpcContext>().create({
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				appMessage:
					error.cause instanceof Error && error.cause.message
						? error.cause.message
						: undefined,
			},
		};
	},
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export { TRPCError };
