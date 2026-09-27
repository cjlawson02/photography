/** Long-lived CDN cache; public URLs carry `?v=updatedAt` so reprocess changes the cache key. */
export const PORTFOLIO_VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Admin JWT portfolio media — not CDN-cacheable; drafts must not leak via shared cache. */
export const ADMIN_PORTFOLIO_VARIANT_CACHE_CONTROL = 'private';

export const PORTFOLIO_ROBOTS_HEADER = 'noindex, nofollow';
