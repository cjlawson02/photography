/**
 * Review (Picu-style) domain schema.
 *
 * Owns proofing assets that point at the REVIEW R2 bucket.
 * Collections / selections land in Phase 4 — Phase 1 only needs photo rows
 * so ingest can target REVIEW with the same pattern as portfolio.
 * R2 keys are derived from `id` via ingest key helpers (not stored here).
 *
 * Separate table set from portfolio — no shared photos table across domains.
 */
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { PhotoStatus } from '../../../lib/ingest/types.ts';

export const reviewPhotos = sqliteTable('review_photos', {
	id: text('id').primaryKey(),
	status: text('status').$type<PhotoStatus>().notNull(),
	contentType: text('content_type'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

export type ReviewPhoto = typeof reviewPhotos.$inferSelect;
export type NewReviewPhoto = typeof reviewPhotos.$inferInsert;
