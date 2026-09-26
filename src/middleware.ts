import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';

import { guardAdminPathAccess } from './lib/access/admin-path-gate.ts';
import { accessEnvFrom } from './lib/cloudflare-env.ts';
import { applyDefaultCacheControl } from './lib/http/cache-control.ts';
import { applySecurityHeaders } from './lib/http/security-headers.ts';

/**
 * Security headers + default Cache-Control on every Worker response.
 * When Access env is configured, require JWT on `/admin*` (defense-in-depth for SSR reads
 * and stale-pending cleanup; tRPC still re-verifies). Skips when Access vars are unset (local).
 * Handlers that already set Cache-Control (media, admin preview) are left alone.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const denied = await guardAdminPathAccess(context.request, pathname, accessEnvFrom(env));
  if (denied) {
    applySecurityHeaders(denied.headers);
    applyDefaultCacheControl(pathname, denied.headers);
    return denied;
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  applyDefaultCacheControl(pathname, response.headers);
  return response;
});
