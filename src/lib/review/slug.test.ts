import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildReviewSlug,
  generateReviewSlugSecret,
  isWeakReviewSlug,
  reviewSlugPrefixSchema,
} from './slug.ts';

describe('review slug', () => {
  it('generateReviewSlugSecret is URL-safe and long enough', () => {
    const secret = generateReviewSlugSecret();
    assert.match(secret, /^[A-Za-z0-9_-]+$/);
    assert.ok(secret.length >= 20);
  });

  it('buildReviewSlug adds optional prefix', () => {
    const slug = buildReviewSlug('smith-wedding');
    assert.ok(slug.startsWith('smith-wedding-'));
    assert.ok(slug.length > 'smith-wedding-'.length);
  });

  it('buildReviewSlug without prefix is secret-only', () => {
    const slug = buildReviewSlug();
    assert.doesNotMatch(slug, /-/);
  });

  it('isWeakReviewSlug flags short or unsafe slugs', () => {
    assert.equal(isWeakReviewSlug('abc'), true);
    assert.equal(isWeakReviewSlug('short-slug'), true);
    assert.equal(isWeakReviewSlug('valid-long-slug-segment'), false);
  });

  it('reviewSlugPrefixSchema normalizes and validates', () => {
    assert.equal(reviewSlugPrefixSchema.parse('Smith-Wedding'), 'smith-wedding');
    assert.throws(() => reviewSlugPrefixSchema.parse('a'));
    assert.throws(() => reviewSlugPrefixSchema.parse('bad_underscore'));
  });
});
