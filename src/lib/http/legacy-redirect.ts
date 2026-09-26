import { SITE_ORIGIN } from '../site/public-meta.ts';

/** Hostnames that should 301 to the canonical Workers site (see docs/CUTOVER.md). */
const LEGACY_HOSTS = new Set(['lawsonphotography.me', 'www.lawsonphotography.me']);

/**
 * When the request targets a legacy hostname, return the canonical URL (path + query preserved).
 */
export function legacyRedirectTarget(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!LEGACY_HOSTS.has(host)) return null;

  const path = url.pathname || '/';
  const target = new URL(path + url.search, SITE_ORIGIN);
  return target.href;
}
