import { createDb } from '../../db/client.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import { AppError } from '../http/app-error.ts';
import { resolveReviewCollectionAccess } from './collection-access.ts';
import { areClientPicksLocked, countSubmittedPicks } from './picks-lock.ts';

/** Client finished choosing — lock picks and advance job step. */
export async function submitClientPicks(d1: D1Database, slug: string) {
  const collections = new ReviewCollectionsDAO(createDb(d1));
  const photos = new ReviewPhotosDAO(createDb(d1));

  const collection = await collections.getBySlug(slug);
  const access = resolveReviewCollectionAccess(collection);
  if (!access.ok) {
    if (access.reason === 'expired') {
      throw new AppError('PRECONDITION_FAILED', 'This review link has expired');
    }
    throw new AppError('NOT_FOUND', 'Review collection not found');
  }

  if (access.collection.status !== 'shared') {
    throw new AppError('PRECONDITION_FAILED', 'Picks cannot be submitted at this step');
  }

  if (areClientPicksLocked(access.collection.status)) {
    throw new AppError('PRECONDITION_FAILED', 'Picks are already submitted');
  }

  const ready = await photos.listReadyByCollectionId(access.collection.id);
  if (ready.length === 0) {
    throw new AppError('PRECONDITION_FAILED', 'No photos are ready to submit');
  }

  const pickCount = countSubmittedPicks(ready);
  if (pickCount === 0) {
    throw new AppError('PRECONDITION_FAILED', 'Select at least one photo before submitting');
  }

  const now = Date.now();
  const updated = await collections.update(access.collection.id, {
    status: 'picks_submitted',
    submittedAt: now,
  });
  if (!updated) {
    throw new AppError('NOT_FOUND', 'Review collection not found');
  }

  return { collection: updated, pickCount };
}
