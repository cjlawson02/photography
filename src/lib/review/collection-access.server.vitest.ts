import { describe, expect, it } from 'vitest';

import { resolveReviewCollectionAccess } from './collection-access.ts';

describe('resolveReviewCollectionAccess', () => {
  const base = {
    id: 'c1',
    slug: 'test',
    title: null,
    expiresAt: null,
    createdAt: 0,
    updatedAt: 0,
  };

  it('rejects missing collection', () => {
    expect(resolveReviewCollectionAccess(null)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('rejects expired collection', () => {
    const result = resolveReviewCollectionAccess({ ...base, expiresAt: 1_000 }, 2_000);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts active collection', () => {
    const result = resolveReviewCollectionAccess({ ...base, expiresAt: 5_000 }, 2_000);
    expect(result.ok).toBe(true);
  });
});
