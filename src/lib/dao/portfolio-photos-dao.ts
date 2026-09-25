import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import { PortfolioPhotos } from '../../db/schema/portfolio/photos.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';
import { mergeDefined } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

/** Portfolio photo DAO — insert/get/update for ingest + catalog. */
export class PortfolioPhotosDAO {
	constructor(private readonly db: Db) {}

	async insert(values: {
		status?: PhotoStatus;
		mimeType?: string | null;
		id?: string;
	}) {
		const row = {
			status: values.status ?? ('pending' as const),
			mimeType: values.mimeType ?? null,
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

	async update(id: string, patch: { status?: PhotoStatus; mimeType?: string | null }) {
		const existing = await this.getById(id);
		if (!existing) return null;
		const next = mergeDefined(
			{ status: existing.status, mimeType: existing.mimeType },
			patch,
		);
		const updated = await this.db
			.update(PortfolioPhotos)
			.set(next)
			.where(eq(PortfolioPhotos.id, id))
			.returning();
		return updated[0] ?? null;
	}
}
