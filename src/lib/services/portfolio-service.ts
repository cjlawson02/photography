import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { PortfolioPhotosDAO } from '../dao/portfolio-photos-dao.ts';
import { AppError } from '../http/app-error.ts';
import { photoIngestObjectKeys } from '../ingest/keys.ts';
import { portfolioVariantPublicUrl } from '../media/portfolio-public-url.ts';
import type { PortfolioPhotoAdminUpdateBody } from '../admin/portfolio-schemas.ts';

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
  /** Public delivery: ingest `gallery.webp` (1600px wide) — largest generated variant. */
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

  async listForAdmin() {
    return this.app.d1.portfolioPhotos.listForAdmin();
  }

  async listPublishedForPublic(): Promise<PublicPortfolioPhoto[]> {
    const rows = await this.app.d1.portfolioPhotos.listPublishedReady();
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
      galleryUrl: portfolioVariantPublicUrl(row.id, 'gallery.webp', row.updatedAt),
    }));
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
      await this.cleanupR2Objects(id);
    }

    const deleted = await this.app.d1.portfolioPhotos.deleteById(id);
    if (!deleted) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }

    return deleted;
  }

  private async cleanupR2Objects(id: string): Promise<void> {
    const keys = photoIngestObjectKeys(id);
    try {
      await this.app.r2.deleteObjects('portfolio', keys);
    } catch (error) {
      console.error('[portfolio-delete] R2 batch delete failed', { id, keys, error });
      throw new AppError(
        'INTERNAL_SERVER_ERROR',
        'Failed to delete portfolio objects from storage',
      );
    }
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
    galleryUrl: portfolioVariantPublicUrl(row.id, 'gallery.webp', row.updatedAt),
  }));
}
