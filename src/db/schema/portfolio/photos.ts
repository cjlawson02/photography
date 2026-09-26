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
  /** Visible on public site when true and ingest `status` is `ready`. */
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  /** Filter chip label — one of the live-site categories; null = uncategorized. */
  category: text('category'),
  /** Lower sorts first on public grid; null sorts after explicit values. */
  sortOrder: integer('sortOrder', { mode: 'number' }),
  /** Future hero carousel — nullable intent; defaults false for new rows. */
  hero: integer('hero', { mode: 'boolean' }).notNull().default(false),
});
