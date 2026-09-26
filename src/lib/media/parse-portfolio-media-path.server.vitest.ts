import { describe, expect, it } from 'vitest';

import { parsePortfolioMediaPath } from './parse-portfolio-media-path.ts';

describe('parsePortfolioMediaPath', () => {
  it('accepts id + allowlisted variant', () => {
    const id = 'clxyz123';
    const result = parsePortfolioMediaPath(`${id}/gallery.webp`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(id);
      expect(result.variantSuffix).toBe('gallery.webp');
      expect(result.r2Key).toBe(`${id}/gallery.webp`);
    }
  });

  it('rejects original and unknown suffixes', () => {
    expect(parsePortfolioMediaPath('id/original').ok).toBe(false);
    expect(parsePortfolioMediaPath('id/hero.jpg').ok).toBe(false);
  });

  it('rejects extra path segments', () => {
    expect(parsePortfolioMediaPath('a/b/c').ok).toBe(false);
  });
});
