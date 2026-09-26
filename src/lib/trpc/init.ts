import { initTRPC } from '@trpc/server';

import type { TrpcContext } from './context.ts';

const t = initTRPC.context<TrpcContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export const trpc = t;
