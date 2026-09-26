import { z } from 'zod/v4';

/** Optional human-readable prefix before the server-generated secret segment. */
export const reviewSlugPrefixSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(2, 'Slug prefix must be at least 2 characters')
      .max(32, 'Slug prefix must be at most 32 characters')
      .regex(
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        'Slug prefix must be URL-safe (lowercase letters, numbers, hyphens)',
      ),
  );

const RANDOM_BYTES = 16;

/** URL-safe random segment (base64url, no padding). */
export function generateReviewSlugSecret(): string {
  const bytes = new Uint8Array(RANDOM_BYTES);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build `/review/{slug}` value: optional prefix + cryptographically random suffix. */
export function buildReviewSlug(slugPrefix?: string): string {
  const secret = generateReviewSlugSecret();
  if (!slugPrefix) return secret;
  return `${slugPrefix}-${secret}`;
}

/** Reject legacy client-provided slugs that are too short or not URL-safe. */
export function isWeakReviewSlug(slug: string): boolean {
  const trimmed = slug.trim();
  if (trimmed.length < 12) return true;
  return !/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(trimmed);
}
