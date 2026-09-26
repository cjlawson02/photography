import { describe, expect, it } from 'vitest';

import {
  buildReviewSlug,
  generateReviewSlugSecret,
  isWeakReviewSlug,
  reviewSlugPrefixSchema,
} from './slug.ts';

describe('review slug', () => {
  it('generateReviewSlugSecret is URL-safe and long enough', () => {
    const secret = generateReviewSlugSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(20);
  });

  it('buildReviewSlug adds optional prefix', () => {
    const slug = buildReviewSlug('smith-wedding');
    expect(slug.startsWith('smith-wedding-')).toBe(true);
    expect(slug.length).toBeGreaterThan('smith-wedding-'.length);
  });

  it('buildReviewSlug without prefix is secret-only', () => {
    const slug = buildReviewSlug();
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(slug.length).toBeGreaterThanOrEqual(20);
  });

  it('isWeakReviewSlug flags short or unsafe slugs', () => {
    expect(isWeakReviewSlug('abc')).toBe(true);
    expect(isWeakReviewSlug('short-slug')).toBe(true);
    expect(isWeakReviewSlug('valid-long-slug-segment')).toBe(false);
  });

  it('reviewSlugPrefixSchema normalizes and validates', () => {
    expect(reviewSlugPrefixSchema.parse('Smith-Wedding')).toBe('smith-wedding');
    expect(() => reviewSlugPrefixSchema.parse('a')).toThrow();
    expect(() => reviewSlugPrefixSchema.parse('bad_underscore')).toThrow();
  });
});
