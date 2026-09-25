import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Review collection — Picu-style proofing set addressed by `/review/{slug}`.
 * Phase 1: link secrecy only (no reviewer accounts). TTL default `_TBD_`.
 */
export const ReviewCollections = sqliteTable(
	'ReviewCollections',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		slug: text('slug').notNull(),
		title: text('title'),
		expiresAt: integer('expiresAt', { mode: 'number' }),
		createdAt: integer('createdAt', { mode: 'number' })
			.notNull()
			.default(sql`(strftime('%s', 'now') * 1000)`),
		updatedAt: integer('updatedAt', { mode: 'number' })
			.notNull()
			.default(sql`(strftime('%s', 'now') * 1000)`)
			.$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`),
	},
	(table) => [uniqueIndex('ReviewCollections_slug_uidx').on(table.slug)],
);
