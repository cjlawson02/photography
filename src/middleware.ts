import { defineMiddleware } from 'astro:middleware';

import { applySecurityHeaders } from './lib/http/security-headers.ts';

/** Attach baseline security headers to every response. */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
