import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

import type { PhotoStatus } from '../photo-status.ts';

/**
 * Portfolio photo rows — public-site catalog → PORTFOLIO R2.
 * Minimal columns until HLD locks product fields; R2 keys derive from `id`.
 */
export const PortfolioPhotos = sqliteTable('PortfolioPhotos', {
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
