import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState, type ReactNode } from 'react';

import type { AppRouter } from './router.ts';
import { adminTrpcFetch, TRPC_URL } from './admin-fetch.ts';
import { getAdminQueryClient } from './query-client.ts';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function makeAdminTrpcClient() {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: TRPC_URL,
				fetch: adminTrpcFetch,
			}),
		],
	});
}

type AdminTrpcProviderProps = {
	children: ReactNode;
};

/** Wrap each admin island that uses TanStack Query + tRPC v11 hooks. */
export function AdminTrpcProvider({ children }: AdminTrpcProviderProps) {
	const queryClient = getAdminQueryClient();
	const [trpcClient] = useState(() => makeAdminTrpcClient());

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{children}
			</TRPCProvider>
		</QueryClientProvider>
	);
}
