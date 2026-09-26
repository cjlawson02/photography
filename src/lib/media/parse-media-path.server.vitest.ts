import { describe, expect, it } from 'vitest';

import { parseMediaPath } from './parse-media-path.ts';

describe('parseMediaPath', () => {
  it('accepts id + allowlisted variant', () => {
    const id = 'clxyz123';
    const result = parseMediaPath(`${id}/gallery.webp`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(id);
      expect(result.variantSuffix).toBe('gallery.webp');
      expect(result.r2Key).toBe(`${id}/gallery.webp`);
    }
  });

  it('rejects original unless allowOriginal is set', () => {
    expect(parseMediaPath('id/original').ok).toBe(false);
    const allowed = parseMediaPath('id/original', { allowOriginal: true });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) {
      expect(allowed.isOriginal).toBe(true);
      expect(allowed.r2Key).toBe('id/original');
    }
    expect(parseMediaPath('id/hero.jpg').ok).toBe(false);
  });

  it('rejects extra path segments', () => {
    expect(parseMediaPath('a/b/c').ok).toBe(false);
  });

  it('rejects empty paths', () => {
    expect(parseMediaPath(undefined).ok).toBe(false);
    expect(parseMediaPath('').ok).toBe(false);
    expect(parseMediaPath('   ').ok).toBe(false);
  });
});
