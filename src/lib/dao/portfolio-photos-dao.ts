import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import type { PortfolioCategory } from '../../db/schema/portfolio/categories.ts';
import { PortfolioPhotos } from '../../db/schema/portfolio/photos.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';
import { mergeDefined } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

export type PortfolioPhotoRow = typeof PortfolioPhotos.$inferSelect;

/** Portfolio photo DAO — insert/get/update for ingest + catalog. */
export class PortfolioPhotosDAO {
	constructor(private readonly db: Db) {}

	async insert(values: {
		status?: PhotoStatus;
		mimeType?: string | null;
		id?: string;
		published?: boolean;
		category?: PortfolioCategory | null;
		sortOrder?: number | null;
		hero?: boolean;
	}) {
		const row = {
			status: values.status ?? ('pending' as const),
			mimeType: values.mimeType ?? null,
			published: values.published ?? false,
			category: values.category ?? null,
			sortOrder: values.sortOrder ?? null,
			hero: values.hero ?? false,
			...(values.id ? { id: values.id } : {}),
		};
		const inserted = await this.db.insert(PortfolioPhotos).values(row).returning();
		return inserted[0]!;
	}

	async getById(id: string) {
		const rows = await this.db
			.select()
			.from(PortfolioPhotos)
			.where(eq(PortfolioPhotos.id, id))
			.limit(1);
		return rows[0] ?? null;
	}

	async listForAdmin(limit = 200) {
		return this.db
			.select()
			.from(PortfolioPhotos)
			.orderBy(desc(PortfolioPhotos.updatedAt))
			.limit(limit);
	}

	/** Public home grid — published ingest-ready rows only. */
	async listPublishedReady(limit = 500) {
		return this.db
			.select()
			.from(PortfolioPhotos)
			.where(and(eq(PortfolioPhotos.published, true), eq(PortfolioPhotos.status, 'ready')))
			.orderBy(
				sql`CASE WHEN ${PortfolioPhotos.sortOrder} IS NULL THEN 1 ELSE 0 END`,
				asc(PortfolioPhotos.sortOrder),
				desc(PortfolioPhotos.createdAt),
			)
			.limit(limit);
	}

	async update(
		id: string,
		patch: {
			status?: PhotoStatus;
			mimeType?: string | null;
			published?: boolean;
			category?: PortfolioCategory | null;
			sortOrder?: number | null;
			hero?: boolean;
		},
	) {
		const existing = await this.getById(id);
		if (!existing) return null;
		const next = mergeDefined(
			{
				status: existing.status,
				mimeType: existing.mimeType,
				published: existing.published,
				category: existing.category,
				sortOrder: existing.sortOrder,
				hero: existing.hero,
			},
			patch,
		);
		const updated = await this.db
			.update(PortfolioPhotos)
			.set(next)
			.where(eq(PortfolioPhotos.id, id))
			.returning();
		return updated[0] ?? null;
	}

	async deleteById(id: string) {
		const deleted = await this.db
			.delete(PortfolioPhotos)
			.where(eq(PortfolioPhotos.id, id))
			.returning();
		return deleted[0] ?? null;
	}
}
