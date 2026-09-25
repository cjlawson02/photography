import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

import type { PhotoStatus } from '../photo-status.ts';

/**
 * Review photo rows — Picu-style proofing → REVIEW R2.
 * Separate table set from portfolio; no shared photos table across domains.
 */
export const ReviewPhotos = sqliteTable('ReviewPhotos', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	createdAt: integer('createdAt', { mode: 'number' })
		.notNull()
		.default(sql`(strftime('%s', 'now') * 1000)`),
	updatedAt: integer('updatedAt', { mode: 'number' })
		.notNull()
		.default(sql`(strftime('%s', 'now') * 1000)`)
		.$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`),
	status: text('status').$type<PhotoStatus>().notNull(),
	mimeType: text('mimeType'),
});
