import { createDb } from '../../db/client.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import {
  isReviewDownloadMode,
  resolveReviewCollectionAccess,
} from '../review/collection-access.ts';
import { reviewDownloadFilename } from './review-download-filename.ts';

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
    return isReviewDownloadMode(access.collection.status);
  }
  return !options?.allowOriginal;
}

/**
 * Admin delivery — ready photo only (collection may be expired or not yet delivered; revoke still
 * deletes the row). Originals are limited to final-round photos, matching what clients download.
 */
export async function isReviewMediaAllowedForAdmin(
  db: D1Database,
  photoId: string,
  options?: { allowOriginal?: boolean },
): Promise<boolean> {
  const photo = await new ReviewPhotosDAO(createDb(db)).getById(photoId);
  if (!photo || photo.status !== 'ready') {
    return false;
  }
  return !options?.allowOriginal || photo.round === 'final';
}

export async function reviewOriginalDownloadFilename(
  db: D1Database,
  photoId: string,
): Promise<string | null> {
  const photo = await new ReviewPhotosDAO(createDb(db)).getById(photoId);
  return photo ? reviewDownloadFilename(photo) : null;
}
