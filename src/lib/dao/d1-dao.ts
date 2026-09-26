import type { DrizzleD1Database } from 'drizzle-orm/d1';

import * as schema from '../../db/schema/index.ts';
import { PortfolioPhotosDAO } from './portfolio-photos-dao.ts';
import { ReviewCollectionsDAO } from './review-collections-dao.ts';
import { ReviewPhotosDAO } from './review-photos-dao.ts';

type Db = DrizzleD1Database<typeof schema>;

/**
 * Root D1 DAO — holds domain DAOs for the single photography tenant.
 * No tenantId scoping (v1 is single-tenant).
 */
export class D1DAO {
  private static instance: D1DAO | undefined;

  readonly portfolioPhotos: PortfolioPhotosDAO;
  readonly reviewCollections: ReviewCollectionsDAO;
  readonly reviewPhotos: ReviewPhotosDAO;

  private constructor(db: Db) {
    this.portfolioPhotos = new PortfolioPhotosDAO(db);
    this.reviewCollections = new ReviewCollectionsDAO(db);
    this.reviewPhotos = new ReviewPhotosDAO(db);
  }

  static getInstance(db: Db): D1DAO {
    if (!D1DAO.instance) {
      D1DAO.instance = new D1DAO(db);
    }
    return D1DAO.instance;
  }

  /** Test / local reset helper — not used in production request paths. */
  static resetInstance(): void {
    D1DAO.instance = undefined;
  }
}
