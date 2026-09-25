/**
 * Portfolio domain schema.
 *
 * Owns public-site catalog metadata that points at the PORTFOLIO R2 bucket.
 * Exact product columns remain `_TBD_` in docs/HLD.md — this is the minimal
 * ingest-ready subset (id, status, content type, timestamps) so Phase 1 can run.
 * R2 keys are derived from `id` via ingest key helpers (not stored here).
 *
 * Do not import or join review-domain tables from here.
 */
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { PhotoStatus } from '../../../lib/ingest/types.ts';

export const portfolioPhotos = sqliteTable('portfolio_photos', {
	id: text('id').primaryKey(),
	status: text('status').$type<PhotoStatus>().notNull(),
	contentType: text('content_type'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

export type PortfolioPhoto = typeof portfolioPhotos.$inferSelect;
export type NewPortfolioPhoto = typeof portfolioPhotos.$inferInsert;
