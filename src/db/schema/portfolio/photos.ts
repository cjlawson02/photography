import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

import type { PhotoStatus } from '../photo-status.ts';
import type { PortfolioCategory } from './categories.ts';

/**
 * Portfolio photo rows — public-site catalog → PORTFOLIO R2.
 * Minimal columns until HLD locks product fields; R2 keys derive from `id`.
 */
export const PortfolioPhotos = sqliteTable(
  'PortfolioPhotos',
  {
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
    /** Public filter chips — subset of PORTFOLIO_CATEGORIES; empty = uncategorized. */
    tags: text('tags', { mode: 'json' })
      .$type<PortfolioCategory[]>()
      .notNull()
      .default(sql`'[]'`),
    /**
     * Mosaic large-slot preference (1–5). Neutral default 3; higher favors full-height
     * singles in double-height rows (see mosaic-layout.ts).
     */
    priority: integer('priority', { mode: 'number' }).notNull().default(3),
    /** Lower sorts first on public grid; null sorts after explicit values. */
    sortOrder: integer('sortOrder', { mode: 'number' }),
    /** Future hero carousel — nullable intent; defaults false for new rows. */
    hero: integer('hero', { mode: 'boolean' }).notNull().default(false),
    /** Curated front-page set (A4) — requires published + ready. */
    frontPage: integer('frontPage', { mode: 'boolean' }).notNull().default(false),
    /** Order within the front-page set; lower first. */
    frontPageOrder: integer('frontPageOrder', { mode: 'number' }),
    /** Natural pixel width from ingest (Images `info()` on original). */
    width: integer('width', { mode: 'number' }),
    /** Natural pixel height from ingest (Images `info()` on original). */
    height: integer('height', { mode: 'number' }),
    /** Accessible description for public `<img alt>` and lightbox; null until set in admin. */
    alt: text('alt'),
    /** Optional display title (lightbox); null when unset. */
    title: text('title'),
    /** Promote provenance — review photo copied into portfolio (A6). */
    sourceReviewPhotoId: text('sourceReviewPhotoId'),
  },
  (table) => [index('PortfolioPhotos_published_status_idx').on(table.published, table.status)],
);
