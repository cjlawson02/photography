import type { APIRoute } from 'astro';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

import { createTrpcContext } from '../../../../lib/trpc/context.ts';
import { appRouter } from '../../../../lib/trpc/router.ts';

/**
 * Admin tRPC (fetch adapter). Cloudflare Access + JWT middleware on every procedure.
 * Legacy REST admin routes removed — mutations are tRPC-only (`/admin/api/trpc`).
 */
export const ALL: APIRoute = ({ request }) =>
	fetchRequestHandler({
		endpoint: '/admin/api/trpc',
		req: request,
		router: appRouter,
		createContext: ({ req }: { req: Request }) => createTrpcContext({ request: req }),
		onError({ error, path, type }) {
			const status = getHTTPStatusCodeFromError(error);
			if (status >= 500) {
				console.error('[trpc]', { path, type, code: error.code, message: error.message });
			}
		},
	});

export const prerender = false;
