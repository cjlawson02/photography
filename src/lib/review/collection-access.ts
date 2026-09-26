import type { ReviewCollections } from '../../db/schema/review/collections.ts';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';

type ReviewCollectionRow = typeof ReviewCollections.$inferSelect;

export type ReviewCollectionAccessContext = {
  readyProofCount?: number;
  readyFinalCount?: number;
};

export type ReviewCollectionAccess =
  | { ok: true; collection: ReviewCollectionRow }
  | { ok: false; reason: 'not_found' | 'gallery_closed' };

export function isReviewDownloadMode(status: ReviewJobStatus): boolean {
  return status === 'finals_delivered' || status === 'closed';
}

/**
 * Phase 1: link secrecy only — slug in the URL is the credential.
 * Extension point for a future password gate: add `verifyReviewerCredential(request, collection)`
 * before returning `{ ok: true }`, without changing public route shapes.
 *
 * `gallery_closed`: link TTL elapsed, or deliverable finals were purged while still before expiry.
 * Closed jobs with remaining finals stay accessible until expiry.
 */
export function resolveReviewCollectionAccess(
  collection: ReviewCollectionRow | null,
  nowMs = Date.now(),
  context?: ReviewCollectionAccessContext,
): ReviewCollectionAccess {
  if (!collection) {
    return { ok: false, reason: 'not_found' };
  }
  if (collection.expiresAt != null && collection.expiresAt <= nowMs) {
    return { ok: false, reason: 'gallery_closed' };
  }
  if (context && isReviewDownloadMode(collection.status) && (context.readyFinalCount ?? 0) === 0) {
    return { ok: false, reason: 'gallery_closed' };
  }
  return { ok: true, collection };
}
