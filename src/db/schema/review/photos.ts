import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

import type { PhotoStatus } from '../photo-status.ts';
import { ReviewCollections } from './collections.ts';
import type { SelectionStatus } from './selection-status.ts';

/**
 * Review photo rows — Picu-style proofing → REVIEW R2.
 * Belongs to a ReviewCollections row; ingest `status` is distinct from `selectionStatus`.
 */
export const ReviewPhotos = sqliteTable(
  'ReviewPhotos',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    collectionId: text('collectionId')
      .notNull()
      .references(() => ReviewCollections.id),
    createdAt: integer('createdAt', { mode: 'number' })
      .notNull()
      .default(sql`(strftime('%s', 'now') * 1000)`),
    updatedAt: integer('updatedAt', { mode: 'number' })
      .notNull()
      .default(sql`(strftime('%s', 'now') * 1000)`)
      .$onUpdate(() => sql`(strftime('%s', 'now') * 1000)`),
    /** Ingest pipeline state — not client select/approve. */
    status: text('status').$type<PhotoStatus>().notNull(),
    mimeType: text('mimeType'),
    /** Client select/approve — independent of ingest `status`. */
    selectionStatus: text('selectionStatus').$type<SelectionStatus>().notNull().default('none'),
    /** Natural pixel width from ingest (Images `info()` on original). */
    width: integer('width', { mode: 'number' }),
    /** Natural pixel height from ingest (Images `info()` on original). */
    height: integer('height', { mode: 'number' }),
    /** Original upload basename for Lightroom export / final matching (A2). */
    originalFilename: text('originalFilename'),
  },
  (table) => [index('ReviewPhotos_collectionId_idx').on(table.collectionId)],
);
