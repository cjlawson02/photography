import { defineMiddleware } from 'astro:middleware';

import { legacyRedirectTarget } from './lib/http/legacy-redirect.ts';
import { applySecurityHeaders } from './lib/http/security-headers.ts';

/** Legacy 301 + baseline security headers on every response. */
export const onRequest = defineMiddleware(async (context, next) => {
  const redirectTo = legacyRedirectTarget(context.url);
  if (redirectTo) {
    return context.redirect(redirectTo, 301);
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
