import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from './lib/access/verify-jwt.ts';
import { accessEnvFrom } from './lib/cloudflare-env.ts';
import { applySecurityHeaders } from './lib/http/security-headers.ts';

/**
 * Security headers on every response.
 * When Access env is configured, require JWT on `/admin*` (defense-in-depth for SSR reads
 * and stale-pending cleanup; tRPC still re-verifies). Skips when Access vars are unset (local).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const accessEnv = accessEnvFrom(env);
    if (accessEnv.CF_ACCESS_TEAM_DOMAIN && accessEnv.CF_ACCESS_AUD) {
      try {
        await verifyAccessJwt(context.request, accessEnv);
      } catch (error) {
        const denied = accessDeniedResponse(error);
        applySecurityHeaders(denied.headers);
        return denied;
      }
    }
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
