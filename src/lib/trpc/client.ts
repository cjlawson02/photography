import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from './router.ts';

const TRPC_URL = '/admin/api/trpc';

function isAccessLoginResponse(response: Response): boolean {
	if (response.redirected) return true;
	const contentType = response.headers.get('content-type') ?? '';
	return contentType.includes('text/html');
}

/** Browser admin islands — same-origin + Access cookie on `/admin*`. */
export const adminTrpc = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: TRPC_URL,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: 'same-origin',
				}).then((response) => {
					if (isAccessLoginResponse(response)) {
						if (typeof location !== 'undefined') {
							location.reload();
						}
						throw new Error('Access session expired — reloading admin…');
					}
					return response;
				});
			},
		}),
	],
});

export { TRPC_URL };
