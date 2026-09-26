import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '../trpc/router.ts';
import { adminTrpc } from '../trpc/client.ts';

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AdminReviewCollection = RouterOutputs['review']['collections']['list'][number];

export async function fetchReviewCollections(): Promise<AdminReviewCollection[]> {
	return adminTrpc.review.collections.list.query();
}

export async function createReviewCollection(input: {
	slug: string;
	title?: string;
	expiresAt?: number;
}): Promise<AdminReviewCollection> {
	return adminTrpc.review.collections.create.mutate(input);
}

export async function revokeReviewCollection(id: string): Promise<void> {
	await adminTrpc.review.collections.revoke.mutate({ id });
}
