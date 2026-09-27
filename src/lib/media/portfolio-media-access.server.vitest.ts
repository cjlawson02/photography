import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/client.ts', () => ({
  createDb: (db: D1Database) => db,
}));

const getById = vi.fn();

vi.mock('../dao/portfolio-photos-dao.ts', () => ({
  PortfolioPhotosDAO: class {
    getById = getById;
  },
}));

import {
  isPortfolioMediaAllowed,
  isPortfolioMediaAllowedForAdmin,
} from './portfolio-media-access.ts';

const db = {} as D1Database;

describe('portfolio media access', () => {
  it('public allow requires published + ready', async () => {
    getById.mockResolvedValueOnce({ published: false, status: 'ready' });
    expect(await isPortfolioMediaAllowed(db, 'id')).toBe(false);

    getById.mockResolvedValueOnce({ published: true, status: 'pending' });
    expect(await isPortfolioMediaAllowed(db, 'id')).toBe(false);

    getById.mockResolvedValueOnce({ published: true, status: 'ready' });
    expect(await isPortfolioMediaAllowed(db, 'id')).toBe(true);
  });

  it('admin allow requires ready only (drafts ok)', async () => {
    getById.mockResolvedValueOnce({ published: false, status: 'ready' });
    expect(await isPortfolioMediaAllowedForAdmin(db, 'id')).toBe(true);

    getById.mockResolvedValueOnce({ published: false, status: 'pending' });
    expect(await isPortfolioMediaAllowedForAdmin(db, 'id')).toBe(false);
  });
});
