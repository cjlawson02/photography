import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../http/app-error.ts';
import { loadReviewCollectionDetail } from './ssr-initial-reads.ts';

describe('loadReviewCollectionDetail', () => {
  it('returns null when the collection is missing', async () => {
    const app = {
      d1: {
        reviewCollections: {
          getById: vi.fn().mockResolvedValue(null),
        },
        reviewPhotos: {
          listByCollectionId: vi.fn(),
        },
      },
    };

    const result = await loadReviewCollectionDetail(app as never, 'missing-id');
    expect(result).toBeNull();
  });

  it('rethrows non-NOT_FOUND errors', async () => {
    const app = {
      d1: {
        reviewCollections: {
          getById: vi.fn().mockRejectedValue(new AppError('INTERNAL_SERVER_ERROR', 'boom')),
        },
      },
    };

    await expect(loadReviewCollectionDetail(app as never, 'id')).rejects.toThrow('boom');
  });
});
