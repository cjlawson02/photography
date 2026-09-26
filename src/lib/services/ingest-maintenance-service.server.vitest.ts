import { describe, expect, it, vi } from 'vitest';

import type { D1DAO } from '../dao/index.ts';
import type { R2DAO } from '../dao/r2-dao.ts';
import { IngestMaintenanceService } from './ingest-maintenance-service.ts';

function makeService(overrides: {
  deleteObjects?: R2DAO['deleteObjects'];
  deletePortfolio?: (id: string) => Promise<void>;
  deleteReview?: (id: string) => Promise<void>;
}) {
  const portfolioDelete = vi.fn(overrides.deletePortfolio ?? (async () => undefined));
  const reviewDelete = vi.fn(overrides.deleteReview ?? (async () => undefined));
  const deleteObjects = vi.fn(
    overrides.deleteObjects ?? (async () => undefined),
  ) as unknown as R2DAO['deleteObjects'];

  const d1 = {
    portfolioPhotos: {
      listPendingCreatedBefore: async () => [{ id: 'p1' }],
      deleteById: portfolioDelete,
    },
    reviewPhotos: {
      listPendingCreatedBefore: async () => [{ id: 'r1' }],
      deleteById: reviewDelete,
    },
  } as unknown as D1DAO;

  const r2 = { deleteObjects } as unknown as R2DAO;
  return {
    service: new IngestMaintenanceService(d1, r2),
    portfolioDelete,
    reviewDelete,
    deleteObjects,
  };
}

describe('IngestMaintenanceService', () => {
  it('deletes D1 rows after successful R2 cleanup', async () => {
    const { service, portfolioDelete, reviewDelete } = makeService({});
    const result = await service.cleanupStalePending({ nowMs: 1_000_000 });

    expect(result.portfolioRemoved).toEqual(['p1']);
    expect(result.reviewRemoved).toEqual(['r1']);
    expect(portfolioDelete).toHaveBeenCalledWith('p1');
    expect(reviewDelete).toHaveBeenCalledWith('r1');
  });

  it('skips D1 delete when R2 cleanup fails (FIX-32)', async () => {
    const { service, portfolioDelete, reviewDelete, deleteObjects } = makeService({
      deleteObjects: async () => {
        throw new Error('R2 unavailable');
      },
    });

    const result = await service.cleanupStalePending({ nowMs: 1_000_000 });

    expect(deleteObjects).toHaveBeenCalled();
    expect(result.portfolioRemoved).toEqual([]);
    expect(result.reviewRemoved).toEqual([]);
    expect(portfolioDelete).not.toHaveBeenCalled();
    expect(reviewDelete).not.toHaveBeenCalled();
  });
});
