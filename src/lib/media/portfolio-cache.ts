/** Long-lived CDN cache; public URLs carry `?v=updatedAt` so reprocess changes the cache key. */
export const PORTFOLIO_VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable';
