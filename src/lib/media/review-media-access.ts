import { createDb } from '../../db/client.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import { resolveReviewCollectionAccess } from '../review/collection-access.ts';

/** Review delivery — ready photo in a non-expired collection (revoked = collection deleted). */
export async function isReviewMediaAllowed(db: D1Database, photoId: string): Promise<boolean> {
  const photos = new ReviewPhotosDAO(createDb(db));
  const photo = await photos.getById(photoId);
  if (!photo || photo.status !== 'ready') {
    return false;
  }
  const collection = await new ReviewCollectionsDAO(createDb(db)).getById(photo.collectionId);
  const access = resolveReviewCollectionAccess(collection);
  return access.ok;
}

/** Admin delivery — ready photo only (collection may be expired; revoke still deletes the row). */
export async function isReviewMediaAllowedForAdmin(
  db: D1Database,
  photoId: string,
): Promise<boolean> {
  const photo = await new ReviewPhotosDAO(createDb(db)).getById(photoId);
  return photo !== null && photo.status === 'ready';
}
