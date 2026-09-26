import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReviewMediaPath } from './parse-review-media-path.ts';

describe('parseReviewMediaPath', () => {
  it('accepts id + allowlisted variant', () => {
    const id = 'clxyz123';
    const result = parseReviewMediaPath(`${id}/gallery.webp`);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.id, id);
      assert.equal(result.variantSuffix, 'gallery.webp');
      assert.equal(result.r2Key, `${id}/gallery.webp`);
    }
  });

  it('rejects original and unknown suffixes', () => {
    assert.equal(parseReviewMediaPath('id/original').ok, false);
    assert.equal(parseReviewMediaPath('id/hero.jpg').ok, false);
  });

  it('rejects extra path segments', () => {
    assert.equal(parseReviewMediaPath('a/b/c').ok, false);
  });
});
