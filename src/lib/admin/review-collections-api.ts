import { adminTrpc } from '../trpc/client.ts';

export type AdminReviewCollection = {
	id: string;
	slug: string;
	title: string | null;
	expiresAt: number | null;
	createdAt: number;
};

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
