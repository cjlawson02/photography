import { createDb } from '../../db/client.ts';
import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import { AppError } from '../http/app-error.ts';
import { resolveReviewCollectionAccess } from './collection-access.ts';

/** Public selection mutation — D1 only (no R2 S3 secrets). */
export async function updateReviewSelection(
  d1: D1Database,
  input: { slug: string; photoId: string; selectionStatus: SelectionStatus },
) {
  const collections = new ReviewCollectionsDAO(createDb(d1));
  const photos = new ReviewPhotosDAO(createDb(d1));

  const collection = await collections.getBySlug(input.slug);
  const access = resolveReviewCollectionAccess(collection);
  if (!access.ok) {
    if (access.reason === 'expired') {
      throw new AppError('PRECONDITION_FAILED', 'This review link has expired');
    }
    throw new AppError('NOT_FOUND', 'Review collection not found');
  }

  const photo = await photos.getById(input.photoId);
  if (!photo || photo.collectionId !== access.collection.id) {
    throw new AppError('NOT_FOUND', 'Review photo not found');
  }
  if (photo.status !== 'ready') {
    throw new AppError('PRECONDITION_FAILED', 'Photo is not ready for review');
  }

  const updated = await photos.update(input.photoId, {
    selectionStatus: input.selectionStatus,
  });
  if (!updated) {
    throw new AppError('NOT_FOUND', 'Review photo not found');
  }
  return updated;
}
