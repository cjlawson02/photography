import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

import { reviewJobStatuses } from './job-status.ts';

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
    personName: text('personName'),
    status: text('status', { enum: reviewJobStatuses }).notNull().default('setup'),
    notes: text('notes'),
    sharedAt: integer('sharedAt', { mode: 'number' }),
    submittedAt: integer('submittedAt', { mode: 'number' }),
    deliveredAt: integer('deliveredAt', { mode: 'number' }),
    closedAt: integer('closedAt', { mode: 'number' }),
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
