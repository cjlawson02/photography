import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from './router.ts';
import { adminTrpcFetch, TRPC_URL } from './admin-fetch.ts';

export { TRPC_URL };

/** Imperative tRPC client (ingest upload, legacy api helpers). */
export const adminTrpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: TRPC_URL,
			fetch: adminTrpcFetch,
		}),
	],
});
