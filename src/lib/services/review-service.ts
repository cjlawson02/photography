import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import { AppError } from '../http/app-error.ts';
import { originalKey, VARIANT_SPECS, variantKey } from '../ingest/keys.ts';
import { resolveReviewCollectionAccess } from '../review/collection-access.ts';
import { buildReviewSlug } from '../review/slug.ts';
import { isSqliteUniqueViolation } from '../sqlite-unique-violation.ts';

export type PublicReviewPhoto = {
  id: string;
  galleryUrl: string;
  selectionStatus: SelectionStatus;
};

export type PublicReviewCollection = {
  slug: string;
  title: string | null;
  photos: PublicReviewPhoto[];
};

export class ReviewService {
  constructor(private readonly app: AppEnv) {}

  static from(app: AppEnv): ReviewService {
    return new ReviewService(app);
  }

  async createCollection(input: {
    slugPrefix?: string;
    title?: string | null;
    expiresAt?: number | null;
  }) {
    const dao = this.app.d1.reviewCollections;
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slug = buildReviewSlug(input.slugPrefix);
      try {
        return await dao.insert({
          slug,
          title: input.title,
          expiresAt: input.expiresAt,
        });
      } catch (error) {
        if (isSqliteUniqueViolation(error)) {
          if (attempt === maxAttempts - 1) {
            throw new AppError('CONFLICT', 'Could not allocate a unique review slug');
          }
          continue;
        }
        throw error;
      }
    }
    throw new AppError('INTERNAL_SERVER_ERROR', 'Could not create review collection');
  }

  async revokeCollection(id: string, options: { cleanupR2: boolean }) {
    const existing = await this.app.d1.reviewCollections.getById(id);
    if (!existing) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }

    const photos = await this.app.d1.reviewPhotos.listByCollectionId(id);
    if (options.cleanupR2) {
      for (const photo of photos) {
        await this.cleanupR2Objects(photo.id);
      }
    }

    await this.app.d1.reviewPhotos.deleteByCollectionId(id);
    const deleted = await this.app.d1.reviewCollections.deleteById(id);
    if (!deleted) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }
    return deleted;
  }

  private async cleanupR2Objects(id: string): Promise<void> {
    const keys = [originalKey(id), ...VARIANT_SPECS.map((spec) => variantKey(id, spec.suffix))];
    for (const key of keys) {
      try {
        await this.app.r2.deleteObject('review', key);
      } catch (error) {
        console.error('[review-revoke] R2 delete failed', { id, key, error });
      }
    }
  }
}

export type ReviewPageState =
  | { kind: 'ok'; collection: PublicReviewCollection }
  | { kind: 'expired'; title: string | null }
  | { kind: 'not_found' };

export async function resolveReviewPageState(
  d1: D1Database,
  slug: string,
): Promise<ReviewPageState> {
  const collections = new ReviewCollectionsDAO(createDb(d1));
  const photos = new ReviewPhotosDAO(createDb(d1));
  const row = await collections.getBySlug(slug);
  if (!row) {
    return { kind: 'not_found' };
  }
  const access = resolveReviewCollectionAccess(row);
  if (!access.ok) {
    if (access.reason === 'expired') {
      return { kind: 'expired', title: row.title };
    }
    return { kind: 'not_found' };
  }
  const ready = await photos.listReadyByCollectionId(access.collection.id);
  return {
    kind: 'ok',
    collection: {
      slug: access.collection.slug,
      title: access.collection.title,
      photos: ready.map((photo) => ({
        id: photo.id,
        galleryUrl: `/media/review/${photo.id}/gallery.webp`,
        selectionStatus: photo.selectionStatus,
      })),
    },
  };
}

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
