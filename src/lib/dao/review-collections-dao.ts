import { desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import { ReviewCollections } from '../../db/schema/review/collections.ts';
import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import { ReviewPhotos } from '../../db/schema/review/photos.ts';
import { definedProps } from '../utils/merge-defined.ts';

type Db = DrizzleD1Database<typeof schema>;

/** Review collections DAO — `/review/{slug}` metadata (UI/routes later). */
export class ReviewCollectionsDAO {
  constructor(private readonly db: Db) {}

  async insert(values: {
    slug: string;
    title?: string | null;
    personName?: string | null;
    expiresAt?: number | null;
    notes?: string | null;
    id?: string;
  }) {
    const row = {
      slug: values.slug,
      title: values.title ?? null,
      personName: values.personName ?? null,
      expiresAt: values.expiresAt ?? null,
      notes: values.notes ?? null,
      ...(values.id ? { id: values.id } : {}),
    };
    const inserted = await this.db.insert(ReviewCollections).values(row).returning();
    return inserted[0]!;
  }

  async getById(id: string) {
    const rows = await this.db
      .select()
      .from(ReviewCollections)
      .where(eq(ReviewCollections.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(ReviewCollections)
      .where(eq(ReviewCollections.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async listRecent(limit = 100) {
    return this.db
      .select()
      .from(ReviewCollections)
      .orderBy(desc(ReviewCollections.createdAt))
      .limit(limit);
  }

  async deleteById(id: string) {
    const deleted = await this.db
      .delete(ReviewCollections)
      .where(eq(ReviewCollections.id, id))
      .returning();
    return deleted[0] ?? null;
  }

  /** Atomic revoke — child photos first, then collection (D1 batch). */
  async deleteWithPhotos(collectionId: string): Promise<void> {
    await this.db.batch([
      this.db.delete(ReviewPhotos).where(eq(ReviewPhotos.collectionId, collectionId)),
      this.db.delete(ReviewCollections).where(eq(ReviewCollections.id, collectionId)),
    ]);
  }

  async update(
    id: string,
    patch: {
      slug?: string;
      title?: string | null;
      personName?: string | null;
      status?: ReviewJobStatus;
      notes?: string | null;
      sharedAt?: number | null;
      submittedAt?: number | null;
      deliveredAt?: number | null;
      closedAt?: number | null;
      expiresAt?: number | null;
    },
  ) {
    const set = definedProps(patch);
    if (Object.keys(set).length === 0) {
      return this.getById(id);
    }
    const updated = await this.db
      .update(ReviewCollections)
      .set(set)
      .where(eq(ReviewCollections.id, id))
      .returning();
    return updated[0] ?? null;
  }
}
