import { eq } from 'drizzle-orm';

import type { Db } from '../../db/client.ts';
import { portfolioPhotos } from '../../db/schema/portfolio/index.ts';
import { reviewPhotos } from '../../db/schema/review/index.ts';
import type { PhotoRow, PhotoStatus, PurposeBucket } from './types.ts';

function tableFor(bucket: PurposeBucket) {
	return bucket === 'portfolio' ? portfolioPhotos : reviewPhotos;
}

function mapRow(row: {
	id: string;
	status: PhotoStatus;
	contentType: string | null;
	originalKey: string;
	error: string | null;
	createdAt: string;
	updatedAt: string;
}): PhotoRow {
	return {
		id: row.id,
		status: row.status,
		contentType: row.contentType,
		originalKey: row.originalKey,
		error: row.error,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function insertPendingPhoto(
	db: Db,
	bucket: PurposeBucket,
	input: { id: string; originalKey: string; contentType: string },
): Promise<PhotoRow> {
	const now = new Date().toISOString();
	const table = tableFor(bucket);
	const row = {
		id: input.id,
		status: 'pending' as const,
		contentType: input.contentType,
		originalKey: input.originalKey,
		error: null,
		createdAt: now,
		updatedAt: now,
	};
	await db.insert(table).values(row);
	return mapRow(row);
}

export async function getPhoto(
	db: Db,
	bucket: PurposeBucket,
	id: string,
): Promise<PhotoRow | null> {
	const table = tableFor(bucket);
	const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
	const row = rows[0];
	return row ? mapRow(row) : null;
}

export async function updatePhotoStatus(
	db: Db,
	bucket: PurposeBucket,
	id: string,
	update: { status: PhotoStatus; error?: string | null },
): Promise<void> {
	const table = tableFor(bucket);
	await db
		.update(table)
		.set({
			status: update.status,
			error: update.error === undefined ? undefined : update.error,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(table.id, id));
}
