/** Admin, review, and mutable APIs — never shared-cache. */
export const PRIVATE_NO_STORE = 'private, no-store';

/**
 * Public home HTML — browsers revalidate; short CDN TTL so publish shows up quickly
 * while Workers Caching can still absorb repeat traffic.
 */
export const PUBLIC_HOME_HTML = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export const PUBLIC_ROBOTS = 'public, max-age=3600';

/**
 * Default Cache-Control when a handler did not set one. Required before enabling
 * Workers Caching — bare 200s otherwise get heuristic ~2h CDN TTLs.
 */
export function applyDefaultCacheControl(pathname: string, headers: Headers): void {
  if (headers.has('Cache-Control')) {
    return;
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/review')) {
    headers.set('Cache-Control', PRIVATE_NO_STORE);
    return;
  }

  if (pathname === '/' || pathname === '') {
    headers.set('Cache-Control', PUBLIC_HOME_HTML);
    return;
  }

  if (pathname === '/robots.txt') {
    headers.set('Cache-Control', PUBLIC_ROBOTS);
    return;
  }

  // /health, unknown SSR, etc. — fail closed.
  headers.set('Cache-Control', PRIVATE_NO_STORE);
}
