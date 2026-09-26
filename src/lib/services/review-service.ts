import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { deletePhotoObjects } from '../dao/delete-photo-objects.ts';
import { ReviewCollectionsDAO } from '../dao/review-collections-dao.ts';
import { ReviewPhotosDAO } from '../dao/review-photos-dao.ts';
import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import { AppError } from '../http/app-error.ts';
import { GALLERY_VARIANT, THUMB_VARIANT } from '../ingest/keys.ts';
import { reviewVariantAdminUrl, reviewVariantPublicUrl } from '../media/variant-media-url.ts';
import { resolveReviewCollectionAccess } from '../review/collection-access.ts';
import { isTransitionAllowed } from '../review/job-steps.ts';
export { updateReviewSelection } from '../review/update-selection.ts';
import { buildReviewSlug } from '../review/slug.ts';
import { isSqliteUniqueViolation } from '../sqlite-unique-violation.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';

export type PublicReviewPhoto = {
  id: string;
  galleryUrl: string;
  selectionStatus: SelectionStatus;
  width: number | null;
  height: number | null;
};

export type PublicReviewCollection = {
  slug: string;
  title: string | null;
  photos: PublicReviewPhoto[];
};

export type AdminReviewCollectionPhoto = {
  id: string;
  status: PhotoStatus;
  selectionStatus: SelectionStatus;
  mimeType: string | null;
  createdAt: number;
  updatedAt: number;
  thumbUrl: string | null;
  galleryUrl: string | null;
  width: number | null;
  height: number | null;
};

export type AdminReviewCollectionDetail = {
  collection: {
    id: string;
    slug: string;
    title: string | null;
    personName: string | null;
    status: ReviewJobStatus;
    notes: string | null;
    sharedAt: number | null;
    submittedAt: number | null;
    deliveredAt: number | null;
    closedAt: number | null;
    expiresAt: number | null;
    createdAt: number;
    updatedAt: number;
  };
  photos: AdminReviewCollectionPhoto[];
};

export class ReviewService {
  constructor(private readonly app: AppEnv) {}

  static from(app: AppEnv): ReviewService {
    return new ReviewService(app);
  }

  async createCollection(input: {
    slugPrefix?: string;
    title?: string | null;
    personName?: string | null;
    expiresAt?: number | null;
    notes?: string | null;
  }) {
    const dao = this.app.d1.reviewCollections;
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slug = buildReviewSlug(input.slugPrefix);
      try {
        return await dao.insert({
          slug,
          title: input.title,
          personName: input.personName,
          expiresAt: input.expiresAt,
          notes: input.notes,
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

  async updateCollection(
    id: string,
    patch: {
      title?: string | null;
      personName?: string | null;
      notes?: string | null;
      expiresAt?: number | null;
    },
  ) {
    const updated = await this.app.d1.reviewCollections.update(id, patch);
    if (!updated) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }
    return updated;
  }

  private async maybeAdvanceProofsUploaded(
    collectionId: string,
    status: ReviewJobStatus,
    readyPhotoCount: number,
  ) {
    if (status !== 'setup' || readyPhotoCount === 0) {
      return null;
    }
    return this.app.d1.reviewCollections.update(collectionId, { status: 'proofs_uploaded' });
  }

  async transitionJobStatus(id: string, to: ReviewJobStatus) {
    const collection = await this.app.d1.reviewCollections.getById(id);
    if (!collection) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }
    const from = collection.status;
    if (from === to) {
      return collection;
    }
    if (!isTransitionAllowed(from, to)) {
      throw new AppError('BAD_REQUEST', `Cannot move job from ${from} to ${to}`);
    }

    const now = Date.now();
    const timestamps: {
      sharedAt?: number;
      submittedAt?: number;
      deliveredAt?: number;
      closedAt?: number;
    } = {};
    if (to === 'shared' && collection.sharedAt == null) {
      timestamps.sharedAt = now;
    }

    const updated = await this.app.d1.reviewCollections.update(id, {
      status: to,
      ...timestamps,
    });
    if (!updated) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }
    return updated;
  }

  private mapCollectionRow(collection: {
    id: string;
    slug: string;
    title: string | null;
    personName: string | null;
    status: ReviewJobStatus;
    notes: string | null;
    sharedAt: number | null;
    submittedAt: number | null;
    deliveredAt: number | null;
    closedAt: number | null;
    expiresAt: number | null;
    createdAt: number;
    updatedAt: number;
  }) {
    return {
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      personName: collection.personName,
      status: collection.status,
      notes: collection.notes,
      sharedAt: collection.sharedAt,
      submittedAt: collection.submittedAt,
      deliveredAt: collection.deliveredAt,
      closedAt: collection.closedAt,
      expiresAt: collection.expiresAt,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  async getCollectionDetailForAdmin(id: string): Promise<AdminReviewCollectionDetail> {
    let collection = await this.app.d1.reviewCollections.getById(id);
    if (!collection) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }

    const rows = await this.app.d1.reviewPhotos.listByCollectionId(id);
    const readyCount = rows.filter((row) => row.status === 'ready').length;
    const advanced = await this.maybeAdvanceProofsUploaded(id, collection.status, readyCount);
    if (advanced) {
      collection = advanced;
    }

    const photos: AdminReviewCollectionPhoto[] = rows.map((row) => {
      const ready = row.status === 'ready';
      return {
        id: row.id,
        status: row.status,
        selectionStatus: row.selectionStatus,
        mimeType: row.mimeType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        thumbUrl: ready ? reviewVariantAdminUrl(row.id, THUMB_VARIANT.suffix, row.updatedAt) : null,
        galleryUrl: ready
          ? reviewVariantAdminUrl(row.id, GALLERY_VARIANT.suffix, row.updatedAt)
          : null,
        width: row.width,
        height: row.height,
      };
    });

    return {
      collection: this.mapCollectionRow(collection),
      photos,
    };
  }

  /**
   * Revoke collection: optional R2 purge (batch) before D1 batch removes photos + collection.
   * Matches HLD review cache hygiene — purge storage before catalog rows disappear.
   */
  async revokeCollection(id: string, options: { cleanupR2: boolean }) {
    const existing = await this.app.d1.reviewCollections.getById(id);
    if (!existing) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${id}`);
    }

    const photos = await this.app.d1.reviewPhotos.listByCollectionId(id);
    if (options.cleanupR2) {
      await deletePhotoObjects({
        r2: this.app.r2,
        bucket: 'review',
        photoIds: photos.map((photo) => photo.id),
        logLabel: 'review-revoke',
        logDetails: { id },
        errorMessage: 'Failed to delete review objects from storage',
      });
    }

    await this.app.d1.reviewCollections.deleteWithPhotos(id);
    return existing;
  }

  /**
   * Remove one review photo from a collection; optional R2 purge before D1 (S4 ordering).
   */
  async deleteCollectionPhoto(
    collectionId: string,
    photoId: string,
    options: { cleanupR2: boolean },
  ) {
    const collection = await this.app.d1.reviewCollections.getById(collectionId);
    if (!collection) {
      throw new AppError('NOT_FOUND', `Review collection not found: ${collectionId}`);
    }

    const existing = await this.app.d1.reviewPhotos.getById(photoId);
    if (!existing || existing.collectionId !== collectionId) {
      throw new AppError('NOT_FOUND', `Review photo not found: ${photoId}`);
    }

    if (options.cleanupR2) {
      await deletePhotoObjects({
        r2: this.app.r2,
        bucket: 'review',
        photoIds: [photoId],
        logLabel: 'review-photo-delete',
        logDetails: { collectionId, photoId },
        errorMessage: 'Failed to delete review objects from storage',
      });
    }

    const deleted = await this.app.d1.reviewPhotos.deleteById(photoId);
    if (!deleted) {
      throw new AppError('NOT_FOUND', `Review photo not found: ${photoId}`);
    }

    return deleted;
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
        galleryUrl: reviewVariantPublicUrl(photo.id, GALLERY_VARIANT.suffix, photo.updatedAt),
        selectionStatus: photo.selectionStatus,
        width: photo.width,
        height: photo.height,
      })),
    },
  };
}
