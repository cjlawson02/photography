import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import { ReviewPhotos } from '../../db/schema/review/photos.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';
import { mergeDefined } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

/** Minimal review photo DAO — full ingest / collections land in follow-up PRs. */
export class ReviewPhotosDAO {
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
		const inserted = await this.db.insert(ReviewPhotos).values(row).returning();
		return inserted[0]!;
	}

	async getById(id: string) {
		const rows = await this.db
			.select()
			.from(ReviewPhotos)
			.where(eq(ReviewPhotos.id, id))
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
			.update(ReviewPhotos)
			.set(next)
			.where(eq(ReviewPhotos.id, id))
			.returning();
		return updated[0] ?? null;
	}
}
