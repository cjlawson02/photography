import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';

import { guardAdminPathAccess } from './lib/access/admin-path-gate.ts';
import { accessEnvFrom } from './lib/cloudflare-env.ts';
import { applySecurityHeaders } from './lib/http/security-headers.ts';

/**
 * Security headers on every response.
 * When Access env is configured, require JWT on `/admin*` (defense-in-depth for SSR reads
 * and stale-pending cleanup; tRPC still re-verifies). Skips when Access vars are unset (local).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const denied = await guardAdminPathAccess(
    context.request,
    context.url.pathname,
    accessEnvFrom(env),
  );
  if (denied) {
    return denied;
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
