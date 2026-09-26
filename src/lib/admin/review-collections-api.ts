import type { AdminReviewCollection, AdminReviewCollectionDetail } from './trpc-types.ts';
import { adminTrpc } from '../trpc/client.ts';

export type { AdminReviewCollection, AdminReviewCollectionDetail } from './trpc-types.ts';

export async function fetchReviewCollections(): Promise<AdminReviewCollection[]> {
  return adminTrpc.review.collections.list.query();
}

export async function fetchReviewCollectionDetail(
  id: string,
): Promise<AdminReviewCollectionDetail> {
  return adminTrpc.review.collections.detail.query({ id });
}

export async function createReviewCollection(input: {
  slugPrefix?: string;
  title?: string;
  expiresAt?: number;
}): Promise<AdminReviewCollection> {
  return adminTrpc.review.collections.create.mutate(input);
}

export async function revokeReviewCollection(id: string): Promise<void> {
  await adminTrpc.review.collections.revoke.mutate({ id });
}
