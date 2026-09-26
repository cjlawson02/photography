/**
 * Invalidate Workers Caching entries for media under `/media/{scope}/{photoId}/…`
 * (all variants and `?v=` keys). Soft-fails when purge is unavailable (local/tests).
 */
export async function purgeMediaCacheForPhotoIds(
  scope: 'portfolio' | 'review',
  photoIds: readonly string[],
): Promise<void> {
  const pathPrefixes = [...new Set(photoIds)]
    .filter((id) => id.length > 0)
    .map((id) => `/media/${scope}/${id}`);
  if (pathPrefixes.length === 0) {
    return;
  }

  try {
    const { cache } = await import('cloudflare:workers');
    const result = await cache.purge({ pathPrefixes });
    if (!result.success) {
      console.error('media cache purge failed', { scope, pathPrefixes, errors: result.errors });
    }
  } catch {
    // Local Vitest / wrangler without Workers Caching — nothing to purge.
  }
}
