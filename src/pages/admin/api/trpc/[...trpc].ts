import type { APIRoute } from 'astro';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { createTrpcContext } from '../../../../lib/trpc/context.ts';
import { appRouter } from '../../../../lib/trpc/router.ts';

/**
 * Admin tRPC (fetch adapter). Cloudflare Access + JWT middleware on every procedure.
 * Legacy REST under `/admin/api/*` remains as thin wrappers for smoke docs.
 */
export const ALL: APIRoute = ({ request }) =>
	fetchRequestHandler({
		endpoint: '/admin/api/trpc',
		req: request,
		router: appRouter,
		createContext: ({ req }: { req: Request }) => createTrpcContext({ request: req }),
	});

export const prerender = false;
