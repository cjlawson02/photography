import { and, asc, desc, eq, lt, or, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import type { PortfolioCategory } from '../../db/schema/portfolio/categories.ts';
import { PortfolioPhotos } from '../../db/schema/portfolio/photos.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';
import type { AdminListCursor } from '../pagination/admin-list-cursor.ts';
import { mergeDefined } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

export type PortfolioPhotoRow = typeof PortfolioPhotos.$inferSelect;

/** Portfolio photo DAO — insert/get/update for ingest + catalog. */
export class PortfolioPhotosDAO {
  constructor(private readonly db: Db) {}

  async insert(values: {
    status?: PhotoStatus;
    mimeType?: string | null;
    id?: string;
    published?: boolean;
    category?: PortfolioCategory | null;
    sortOrder?: number | null;
    hero?: boolean;
    width?: number | null;
    height?: number | null;
  }) {
    const row = {
      status: values.status ?? ('pending' as const),
      mimeType: values.mimeType ?? null,
      published: values.published ?? false,
      category: values.category ?? null,
      sortOrder: values.sortOrder ?? null,
      hero: values.hero ?? false,
      width: values.width ?? null,
      height: values.height ?? null,
      ...(values.id ? { id: values.id } : {}),
    };
    const inserted = await this.db.insert(PortfolioPhotos).values(row).returning();
    return inserted[0]!;
  }

  async getById(id: string) {
    const rows = await this.db
      .select()
      .from(PortfolioPhotos)
      .where(eq(PortfolioPhotos.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async listForAdminPage(options: { limit: number; cursor: AdminListCursor | null }) {
    const take = options.limit + 1;
    const cursorWhere = options.cursor
      ? or(
          lt(PortfolioPhotos.updatedAt, options.cursor.updatedAt),
          and(
            eq(PortfolioPhotos.updatedAt, options.cursor.updatedAt),
            lt(PortfolioPhotos.id, options.cursor.id),
          ),
        )
      : undefined;

    const base = this.db.select().from(PortfolioPhotos);
    const filtered = cursorWhere ? base.where(cursorWhere) : base;

    return filtered.orderBy(desc(PortfolioPhotos.updatedAt), desc(PortfolioPhotos.id)).limit(take);
  }

  /** Public home grid — published ingest-ready rows only. */
  async listPublishedReady(limit = 500) {
    return this.db
      .select()
      .from(PortfolioPhotos)
      .where(and(eq(PortfolioPhotos.published, true), eq(PortfolioPhotos.status, 'ready')))
      .orderBy(
        sql`CASE WHEN ${PortfolioPhotos.sortOrder} IS NULL THEN 1 ELSE 0 END`,
        asc(PortfolioPhotos.sortOrder),
        desc(PortfolioPhotos.createdAt),
      )
      .limit(limit);
  }

  async update(
    id: string,
    patch: {
      status?: PhotoStatus;
      mimeType?: string | null;
      published?: boolean;
      category?: PortfolioCategory | null;
      sortOrder?: number | null;
      hero?: boolean;
      width?: number | null;
      height?: number | null;
    },
  ) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const next = mergeDefined(
      {
        status: existing.status,
        mimeType: existing.mimeType,
        published: existing.published,
        category: existing.category,
        sortOrder: existing.sortOrder,
        hero: existing.hero,
        width: existing.width,
        height: existing.height,
      },
      patch,
    );
    const updated = await this.db
      .update(PortfolioPhotos)
      .set(next)
      .where(eq(PortfolioPhotos.id, id))
      .returning();
    return updated[0] ?? null;
  }

  async deleteById(id: string) {
    const deleted = await this.db
      .delete(PortfolioPhotos)
      .where(eq(PortfolioPhotos.id, id))
      .returning();
    return deleted[0] ?? null;
  }
}
