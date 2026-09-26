import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { deletePhotoObjects } from '../dao/delete-photo-objects.ts';
import { PortfolioPhotosDAO } from '../dao/portfolio-photos-dao.ts';
import { AppError } from '../http/app-error.ts';
import { GALLERY_VARIANT } from '../ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../media/variant-media-url.ts';
import type {
  PortfolioListInput,
  PortfolioPhotoAdminUpdateBody,
} from '../admin/portfolio-schemas.ts';
import { decodeAdminListCursor, encodeAdminListCursor } from '../pagination/admin-list-cursor.ts';

export type PublicPortfolioPhoto = {
  id: string;
  category: string | null;
  sortOrder: number | null;
  hero: boolean;
  alt: string | null;
  title: string | null;
  caption: string | null;
  /** Natural pixels from ingest Images `info()`; null until complete. */
  width: number | null;
  height: number | null;
  /** Public delivery: ingest gallery variant (largest generated width). */
  galleryUrl: string;
};

/**
 * Portfolio catalog admin + public read helpers (ingest stays in IngestService).
 */
export class PortfolioService {
  constructor(private readonly app: AppEnv) {}

  static from(app: AppEnv): PortfolioService {
    return new PortfolioService(app);
  }

  async listForAdminPage(input: PortfolioListInput) {
    const cursor = input.cursor ? decodeAdminListCursor(input.cursor) : null;
    if (input.cursor && !cursor) {
      throw new AppError('BAD_REQUEST', 'Invalid list cursor');
    }

    const rows = await this.app.d1.portfolioPhotos.listForAdminPage({
      limit: input.limit,
      cursor,
      stalePendingOnly: input.stalePendingOnly,
    });
    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeAdminListCursor({ updatedAt: last.updatedAt, id: last.id }) : null;

    return { items, nextCursor };
  }

  async updateMetadata(id: string, patch: PortfolioPhotoAdminUpdateBody) {
    const updated = await this.app.d1.portfolioPhotos.update(id, patch);
    if (!updated) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }
    return updated;
  }

  /**
   * Remove catalog row; optional R2 purge runs before D1 so live `/media/portfolio` URLs
   * are not left pointing at deleted rows (orphan R2 only if D1 delete fails after purge).
   */
  async deletePhoto(id: string, options: { cleanupR2: boolean }) {
    const existing = await this.app.d1.portfolioPhotos.getById(id);
    if (!existing) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }

    if (options.cleanupR2) {
      await deletePhotoObjects({
        r2: this.app.r2,
        bucket: 'portfolio',
        photoIds: [id],
        logLabel: 'portfolio-delete',
        logDetails: { id },
        errorMessage: 'Failed to delete portfolio objects from storage',
      });
    }

    const deleted = await this.app.d1.portfolioPhotos.deleteById(id);
    if (!deleted) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }

    return deleted;
  }
}

/** Public pages — D1 only (no R2 S3 secrets). */
export async function listPublishedPortfolioPhotos(
  d1: D1Database,
): Promise<PublicPortfolioPhoto[]> {
  const dao = new PortfolioPhotosDAO(createDb(d1));
  const rows = await dao.listPublishedReady();
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    sortOrder: row.sortOrder,
    hero: row.hero,
    alt: row.alt,
    title: row.title,
    caption: row.caption,
    width: row.width,
    height: row.height,
    galleryUrl: portfolioVariantPublicUrl(row.id, GALLERY_VARIANT.suffix, row.updatedAt),
  }));
}
