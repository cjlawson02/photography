import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from './router.ts';

const TRPC_URL = '/admin/api/trpc';

/** Browser admin islands — same-origin + Access cookie on `/admin*`. */
export const adminTrpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: TRPC_URL,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: 'same-origin',
				});
			},
		}),
	],
});

export { TRPC_URL };
