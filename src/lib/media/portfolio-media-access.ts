import { createDb } from '../../db/client.ts';
import { PortfolioPhotosDAO } from '../dao/portfolio-photos-dao.ts';

/** Public portfolio delivery — published ingest-ready rows only. */
export async function isPortfolioMediaAllowed(db: D1Database, photoId: string): Promise<boolean> {
  const row = await new PortfolioPhotosDAO(createDb(db)).getById(photoId);
  return row !== null && row.published && row.status === 'ready';
}

/** Admin delivery — any ingest-ready portfolio row (draft or published). */
export async function isPortfolioMediaAllowedForAdmin(
  db: D1Database,
  photoId: string,
): Promise<boolean> {
  const row = await new PortfolioPhotosDAO(createDb(db)).getById(photoId);
  return row !== null && row.status === 'ready';
}
