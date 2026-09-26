import { and, asc, eq, lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import { ReviewPhotos } from '../../db/schema/review/photos.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';
import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import { mergeDefined } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

/** Review photo DAO — ingest + selection fields. */
export class ReviewPhotosDAO {
  constructor(private readonly db: Db) {}

  async insert(values: {
    collectionId: string;
    status?: PhotoStatus;
    mimeType?: string | null;
    selectionStatus?: SelectionStatus;
    id?: string;
    width?: number | null;
    height?: number | null;
  }) {
    const row = {
      collectionId: values.collectionId,
      status: values.status ?? ('pending' as const),
      mimeType: values.mimeType ?? null,
      selectionStatus: values.selectionStatus ?? ('none' as const),
      width: values.width ?? null,
      height: values.height ?? null,
      ...(values.id ? { id: values.id } : {}),
    };
    const inserted = await this.db.insert(ReviewPhotos).values(row).returning();
    return inserted[0]!;
  }

  async getById(id: string) {
    const rows = await this.db.select().from(ReviewPhotos).where(eq(ReviewPhotos.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listByCollectionId(collectionId: string) {
    return this.db
      .select()
      .from(ReviewPhotos)
      .where(eq(ReviewPhotos.collectionId, collectionId))
      .orderBy(asc(ReviewPhotos.createdAt));
  }

  /** Public review grid — ingest-ready rows for one collection. */
  async listReadyByCollectionId(collectionId: string) {
    return this.db
      .select()
      .from(ReviewPhotos)
      .where(and(eq(ReviewPhotos.collectionId, collectionId), eq(ReviewPhotos.status, 'ready')))
      .orderBy(asc(ReviewPhotos.createdAt));
  }

  async listPendingCreatedBefore(cutoffMs: number, limit = 100) {
    return this.db
      .select()
      .from(ReviewPhotos)
      .where(and(eq(ReviewPhotos.status, 'pending'), lt(ReviewPhotos.createdAt, cutoffMs)))
      .orderBy(asc(ReviewPhotos.createdAt))
      .limit(limit);
  }

  async deleteByCollectionId(collectionId: string) {
    return this.db.delete(ReviewPhotos).where(eq(ReviewPhotos.collectionId, collectionId));
  }

  async deleteById(id: string) {
    const deleted = await this.db.delete(ReviewPhotos).where(eq(ReviewPhotos.id, id)).returning();
    return deleted[0] ?? null;
  }

  async update(
    id: string,
    patch: {
      collectionId?: string;
      status?: PhotoStatus;
      mimeType?: string | null;
      selectionStatus?: SelectionStatus;
      width?: number | null;
      height?: number | null;
    },
  ) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const next = mergeDefined(
      {
        collectionId: existing.collectionId,
        status: existing.status,
        mimeType: existing.mimeType,
        selectionStatus: existing.selectionStatus,
        width: existing.width,
        height: existing.height,
      },
      patch,
    );
    const updated = await this.db
      .update(ReviewPhotos)
      .set(next)
      .where(eq(ReviewPhotos.id, id))
      .returning();
    return updated[0] ?? null;
  }
}
