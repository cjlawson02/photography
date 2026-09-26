export const TRPC_URL = '/admin/api/trpc';

function isAccessLoginResponse(response: Response): boolean {
	if (response.redirected) return true;
	const contentType = response.headers.get('content-type') ?? '';
	return contentType.includes('text/html');
}

/** Shared browser fetch for admin tRPC — reload on Access session loss. */
export async function adminTrpcFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const response = await fetch(input, {
		...init,
		credentials: 'same-origin',
	});
	if (isAccessLoginResponse(response)) {
		if (typeof location !== 'undefined') {
			location.reload();
		}
		throw new Error('Access session expired — reloading admin…');
	}
	if (response.status === 401) {
		window.location.reload();
	}
	return response;
}
