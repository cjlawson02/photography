import { createDb } from '../../db/client.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import { resolveReviewCollectionAccess } from '../review/collection-access.ts';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';

const DOWNLOAD_JOB_STATUSES: ReviewJobStatus[] = ['finals_delivered', 'closed'];

function isFinalRoundVisible(status: ReviewJobStatus): boolean {
  return DOWNLOAD_JOB_STATUSES.includes(status);
}

/** Review delivery — ready photo in a non-expired collection (revoked = collection deleted). */
export async function isReviewMediaAllowed(
  db: D1Database,
  photoId: string,
  options?: { allowOriginal?: boolean },
): Promise<boolean> {
  const photos = new ReviewPhotosDAO(createDb(db));
  const photo = await photos.getById(photoId);
  if (!photo || photo.status !== 'ready') {
    return false;
  }
  const collection = await new ReviewCollectionsDAO(createDb(db)).getById(photo.collectionId);
  const access = resolveReviewCollectionAccess(collection);
  if (!access.ok) {
    return false;
  }
  if (photo.round === 'final') {
    if (!isFinalRoundVisible(access.collection.status)) {
      return false;
    }
    return true;
  }
  return !options?.allowOriginal;
}

/** Admin delivery — ready photo only (collection may be expired; revoke still deletes the row). */
export async function isReviewMediaAllowedForAdmin(
  db: D1Database,
  photoId: string,
): Promise<boolean> {
  const photo = await new ReviewPhotosDAO(createDb(db)).getById(photoId);
  return photo !== null && photo.status === 'ready';
}
