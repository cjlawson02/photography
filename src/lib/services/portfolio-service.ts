import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { PortfolioPhotosDAO } from '../dao/portfolio-photos-dao.ts';
import { AppError } from '../http/app-error.ts';
import { originalKey, VARIANT_SPECS, variantKey } from '../ingest/keys.ts';
import type { PortfolioPhotoAdminUpdateBody } from '../admin/portfolio-schemas.ts';

export type PublicPortfolioPhoto = {
	id: string;
	category: string | null;
	sortOrder: number | null;
	hero: boolean;
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
			galleryUrl: `/media/portfolio/${row.id}/gallery.webp`,
		}));
	}

	async updateMetadata(id: string, patch: PortfolioPhotoAdminUpdateBody) {
		const updated = await this.app.d1.portfolioPhotos.update(id, patch);
		if (!updated) {
			throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
		}
		return updated;
	}

	async deletePhoto(id: string, options: { cleanupR2: boolean }) {
		const existing = await this.app.d1.portfolioPhotos.getById(id);
		if (!existing) {
			throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
		}

		const deleted = await this.app.d1.portfolioPhotos.deleteById(id);
		if (!deleted) {
			throw new AppError('NOT_FOUND', `Portfolio photo not found: ${id}`);
		}

		if (options.cleanupR2) {
			await this.cleanupR2Objects(id);
		}

		return deleted;
	}

	private async cleanupR2Objects(id: string): Promise<void> {
		const keys = [
			originalKey(id),
			...VARIANT_SPECS.map((spec) => variantKey(id, spec.suffix)),
		];
		for (const key of keys) {
			try {
				await this.app.r2.deleteObject('portfolio', key);
			} catch (error) {
				console.error('[portfolio-delete] R2 delete failed', { id, key, error });
			}
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
		galleryUrl: `/media/portfolio/${row.id}/gallery.webp`,
	}));
}
