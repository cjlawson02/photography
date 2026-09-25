import type { ReviewCollections } from '../../db/schema/review/collections.ts';

type ReviewCollectionRow = typeof ReviewCollections.$inferSelect;

export type ReviewCollectionAccess =
	| { ok: true; collection: ReviewCollectionRow }
	| { ok: false; reason: 'not_found' | 'expired' };

/**
 * Phase 1: link secrecy only — slug in the URL is the credential.
 * Extension point for a future password gate: add `verifyReviewerCredential(request, collection)`
 * before returning `{ ok: true }`, without changing public route shapes.
 */
export function resolveReviewCollectionAccess(
	collection: ReviewCollectionRow | null,
	nowMs = Date.now(),
): ReviewCollectionAccess {
	if (!collection) {
		return { ok: false, reason: 'not_found' };
	}
	if (collection.expiresAt != null && collection.expiresAt <= nowMs) {
		return { ok: false, reason: 'expired' };
	}
	return { ok: true, collection };
}
