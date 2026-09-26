/** Shorter CDN cache than portfolio — cache hygiene when review objects are deleted (HLD). */
export const REVIEW_VARIANT_CACHE_CONTROL = 'public, max-age=86400';

/** Admin JWT review media — not CDN-cacheable; avoids shared-cache leaks on `/admin*`. */
export const ADMIN_REVIEW_VARIANT_CACHE_CONTROL = 'private';

export const REVIEW_ROBOTS_HEADER = 'noindex, nofollow';
