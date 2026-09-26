import { describe, expect, it } from 'vitest';

import { isReviewDownloadMode, resolveReviewCollectionAccess } from './collection-access.ts';

describe('resolveReviewCollectionAccess', () => {
  const base = {
    id: 'c1',
    slug: 'test',
    title: null,
    personName: null,
    status: 'setup' as const,
    notes: null,
    sharedAt: null,
    submittedAt: null,
    deliveredAt: null,
    closedAt: null,
    expiresAt: null,
    createdAt: 0,
    updatedAt: 0,
  };

  it('rejects missing collection', () => {
    expect(resolveReviewCollectionAccess(null)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('rejects expired collection as gallery_closed', () => {
    const result = resolveReviewCollectionAccess({ ...base, expiresAt: 1_000 }, 2_000);
    expect(result).toEqual({ ok: false, reason: 'gallery_closed' });
  });

  it('accepts active collection', () => {
    const result = resolveReviewCollectionAccess({ ...base, expiresAt: 5_000 }, 2_000);
    expect(result.ok).toBe(true);
  });

  it('allows closed collection with deliverable finals until expiry', () => {
    const result = resolveReviewCollectionAccess(
      { ...base, status: 'closed', expiresAt: 5_000 },
      2_000,
      { readyFinalCount: 2 },
    );
    expect(result.ok).toBe(true);
  });

  it('rejects closed collection after finals purged', () => {
    const result = resolveReviewCollectionAccess(
      { ...base, status: 'closed', expiresAt: 5_000 },
      2_000,
      { readyFinalCount: 0 },
    );
    expect(result).toEqual({ ok: false, reason: 'gallery_closed' });
  });
});

describe('isReviewDownloadMode', () => {
  it('is true for delivered and closed', () => {
    expect(isReviewDownloadMode('finals_delivered')).toBe(true);
    expect(isReviewDownloadMode('closed')).toBe(true);
    expect(isReviewDownloadMode('shared')).toBe(false);
  });
});
