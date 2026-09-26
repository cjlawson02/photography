import { createId } from '@paralleldrive/cuid2';
import { describe, expect, it } from 'vitest';

import {
  isAllowlistedVariantSuffix,
  originalKey,
  photoIngestObjectKeys,
  VARIANT_SPECS,
  variantKey,
} from './keys.ts';
import { isPurposeBucket, presignBodySchema } from './schemas.ts';

describe('ingest keys', () => {
  it('derives all object keys from photo id only', () => {
    const id = 'photo-uuid';
    expect(originalKey(id)).toBe(`${id}/original`);
    expect(variantKey(id, 'gallery.webp')).toBe(`${id}/gallery.webp`);
    expect(variantKey(id, 'thumb.webp')).toBe(`${id}/thumb.webp`);
    expect(photoIngestObjectKeys(id)).toEqual([
      `${id}/original`,
      `${id}/gallery.webp`,
      `${id}/thumb.webp`,
    ]);
  });

  it('allowlists provisional variant suffixes only', () => {
    for (const spec of VARIANT_SPECS) {
      expect(isAllowlistedVariantSuffix(spec.suffix)).toBe(true);
    }
    expect(isAllowlistedVariantSuffix('original')).toBe(false);
    expect(isAllowlistedVariantSuffix('../etc/passwd')).toBe(false);
  });
});

describe('purpose buckets', () => {
  it('accepts portfolio and review only', () => {
    expect(isPurposeBucket('portfolio')).toBe(true);
    expect(isPurposeBucket('review')).toBe(true);
    expect(isPurposeBucket('other')).toBe(false);
  });
});

describe('presign body schema', () => {
  it('requires collectionId for review', () => {
    const missing = presignBodySchema.safeParse({
      bucket: 'review',
      contentType: 'image/jpeg',
    });
    expect(missing.success).toBe(false);

    const collectionId = createId();
    const ok = presignBodySchema.safeParse({
      bucket: 'review',
      contentType: 'image/jpeg',
      collectionId,
    });
    expect(ok.success).toBe(true);
    if (ok.success && ok.data.bucket === 'review') {
      expect(ok.data.collectionId).toBe(collectionId);
    }
  });

  it('accepts portfolio without collectionId', () => {
    const ok = presignBodySchema.safeParse({
      bucket: 'portfolio',
      contentType: 'image/jpeg',
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.bucket).toBe('portfolio');
  });
});
