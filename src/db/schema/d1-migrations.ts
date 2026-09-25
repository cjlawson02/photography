import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Wrangler-owned migration bookkeeping table (optional Drizzle reads).
 * Excluded from drizzle-kit generate — Wrangler creates/updates this.
 */
export const d1Migrations = sqliteTable('d1_migrations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name'),
	applied_at: text('applied_at'),
});
