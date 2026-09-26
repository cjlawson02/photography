import { QueryClient } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				refetchOnWindowFocus: false,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

/** Module-level singleton for admin React islands (each island mounts its own provider). */
export function getAdminQueryClient(): QueryClient {
	if (typeof window === 'undefined') {
		return makeQueryClient();
	}
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}
	return browserQueryClient;
}
