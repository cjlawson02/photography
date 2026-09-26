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
import { frontPageBlockReason } from '../portfolio/front-page-eligibility.ts';

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
    const updated = await this.app.d1.portfolioPhotos.update(
      id,
      patch.published === false ? { ...patch, frontPage: false, frontPageOrder: null } : patch,
    );
    if (!updated) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }
    return updated;
  }

  async listFrontPageForAdmin() {
    const rows = await this.app.d1.portfolioPhotos.listFrontPageForAdmin();
    return { items: rows };
  }

  /** Reorder only — `orderedIds` must be exactly the current set; one atomic D1 batch. */
  async reorderFrontPage(orderedIds: string[]) {
    const rows = await this.app.d1.portfolioPhotos.listFrontPageForAdmin();
    const existing = new Set(rows.map((row) => row.id));
    const unique = new Set(orderedIds);
    if (
      unique.size !== orderedIds.length ||
      orderedIds.length !== rows.length ||
      orderedIds.some((id) => !existing.has(id))
    ) {
      throw new AppError('BAD_REQUEST', 'Reorder must include every front-page photo exactly once');
    }
    await this.app.d1.portfolioPhotos.applyFrontPageSet({ orderedIds });
    return { orderedIds };
  }

  /**
   * Replace the whole set (membership, order, hero for listed ids) in one D1 batch.
   * Photos joining the set must pass front-page eligibility.
   */
  async setFrontPage(orderedIds: string[], heroIds: string[] = []) {
    const ordered = new Set(orderedIds);
    if (ordered.size !== orderedIds.length) {
      throw new AppError('BAD_REQUEST', 'Front-page set lists a photo more than once');
    }
    if (heroIds.some((id) => !ordered.has(id))) {
      throw new AppError('BAD_REQUEST', 'Hero photos must be in the front-page set');
    }
    const current = await this.app.d1.portfolioPhotos.listFrontPageForAdmin();
    const currentIds = new Set(current.map((row) => row.id));
    const newcomers = orderedIds.filter((id) => !currentIds.has(id));
    const rows = await this.app.d1.portfolioPhotos.getByIds(newcomers);
    if (rows.length !== newcomers.length) {
      throw new AppError('NOT_FOUND', 'Some front-page photos no longer exist');
    }
    for (const row of rows) {
      const reason = frontPageBlockReason(row);
      if (reason) {
        throw new AppError('BAD_REQUEST', `Cannot add ${row.id} to the front page: ${reason}`);
      }
    }
    await this.app.d1.portfolioPhotos.applyFrontPageSet({
      orderedIds,
      removeIds: current.map((row) => row.id).filter((id) => !ordered.has(id)),
      heroIds,
    });
    return { orderedIds };
  }

  /** Append eligible photos to the end of the set; ineligible ones are skipped with a reason. */
  async addToFrontPage(ids: string[]) {
    const current = await this.app.d1.portfolioPhotos.listFrontPageForAdmin();
    const currentIds = current.map((row) => row.id);
    const onFrontPage = new Set(currentIds);
    const candidates = [...new Set(ids)].filter((id) => !onFrontPage.has(id));
    const rows = new Map(
      (await this.app.d1.portfolioPhotos.getByIds(candidates)).map((row) => [row.id, row]),
    );
    const added: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    for (const id of candidates) {
      const row = rows.get(id);
      const reason = row ? frontPageBlockReason(row) : 'Photo no longer exists.';
      if (reason) skipped.push({ id, reason });
      else added.push(id);
    }
    if (added.length > 0) {
      await this.app.d1.portfolioPhotos.applyFrontPageSet({
        orderedIds: [...currentIds, ...added],
      });
    }
    return { added, skipped };
  }

  async setFrontPageMembership(id: string, onFrontPage: boolean) {
    const photo = await this.app.d1.portfolioPhotos.getById(id);
    if (!photo) {
      throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
    }
    if (onFrontPage) {
      const { skipped } = await this.addToFrontPage([id]);
      if (skipped[0]) {
        throw new AppError('BAD_REQUEST', `Cannot add to the front page: ${skipped[0].reason}`);
      }
      return (await this.app.d1.portfolioPhotos.getById(id)) ?? photo;
    }
    return this.app.d1.portfolioPhotos.update(id, {
      frontPage: false,
      frontPageOrder: null,
      hero: false,
    });
  }

  /** Single UPDATE for the whole selection (atomic); unpublish also leaves the front page. */
  async bulkUpdateMetadata(ids: string[], patch: PortfolioPhotoAdminUpdateBody) {
    const items = await this.app.d1.portfolioPhotos.updateMany(
      [...new Set(ids)],
      patch.published === false ? { ...patch, frontPage: false, frontPageOrder: null } : patch,
    );
    return { items };
  }

  /**
   * Remove catalog rows; optional R2 purge runs before D1 so live `/media/portfolio` URLs
   * are not left pointing at deleted rows (orphan R2 only if D1 delete fails after purge).
   */
  async bulkDeletePhotos(ids: string[], options: { cleanupR2: boolean }) {
    const rows = await this.app.d1.portfolioPhotos.getByIds([...new Set(ids)]);
    const found = rows.map((row) => row.id);
    if (found.length === 0) return { ids: [] };
    if (options.cleanupR2) {
      await deletePhotoObjects({
        r2: this.app.r2,
        bucket: 'portfolio',
        photoIds: found,
        logLabel: 'portfolio-bulk-delete',
        logDetails: { count: found.length },
        errorMessage: 'Failed to delete portfolio objects from storage',
      });
    }
    const deleted = await this.app.d1.portfolioPhotos.deleteMany(found);
    return { ids: deleted.map((row) => row.id) };
  }

  /** Same purge ordering as `bulkDeletePhotos`. */
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

/** Public pages — D1 only (no R2 S3 secrets). All published photos, for category browsing. */
export async function listPublishedPortfolioPhotos(
  d1: D1Database,
): Promise<PublicPortfolioPhoto[]> {
  const dao = new PortfolioPhotosDAO(createDb(d1));
  return (await dao.listPublishedReady()).map(toPublicPortfolioPhoto);
}

/** Curated front-page set in admin order; empty until curated. */
export async function listFrontPagePortfolioPhotos(
  d1: D1Database,
): Promise<PublicPortfolioPhoto[]> {
  const dao = new PortfolioPhotosDAO(createDb(d1));
  return (await dao.listFrontPagePublishedReady()).map(toPublicPortfolioPhoto);
}

function toPublicPortfolioPhoto(
  row: Awaited<ReturnType<PortfolioPhotosDAO['listPublishedReady']>>[number],
): PublicPortfolioPhoto {
  return {
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
  };
}
