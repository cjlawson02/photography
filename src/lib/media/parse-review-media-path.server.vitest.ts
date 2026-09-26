import { describe, expect, it } from 'vitest';

import { parseReviewMediaPath } from './parse-review-media-path.ts';

describe('parseReviewMediaPath', () => {
  it('accepts id + allowlisted variant', () => {
    const id = 'clxyz123';
    const result = parseReviewMediaPath(`${id}/gallery.webp`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(id);
      expect(result.variantSuffix).toBe('gallery.webp');
      expect(result.r2Key).toBe(`${id}/gallery.webp`);
    }
  });

  it('rejects original and unknown suffixes', () => {
    expect(parseReviewMediaPath('id/original').ok).toBe(false);
    expect(parseReviewMediaPath('id/hero.jpg').ok).toBe(false);
  });

  it('rejects extra path segments', () => {
    expect(parseReviewMediaPath('a/b/c').ok).toBe(false);
  });
});
