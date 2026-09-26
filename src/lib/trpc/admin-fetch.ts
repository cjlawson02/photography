export const TRPC_URL = '/admin/api/trpc';

/** Shared browser fetch for admin tRPC — reload on Access session loss. */
export async function adminTrpcFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const response = await fetch(input, {
		...init,
		credentials: 'same-origin',
	});
	if (response.status === 401) {
		window.location.reload();
	}
	return response;
}
