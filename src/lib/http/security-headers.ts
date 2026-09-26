/**
 * Baseline security headers for HTML and API responses.
 * CSP is pragmatic: bundled scripts from `'self'`, inline scripts for Astro island
 * hydration (no nonce pipeline yet), optional Cloudflare Web Analytics beacon.
 */
export function applySecurityHeaders(headers: Headers): void {
  headers.set('Content-Security-Policy', buildContentSecurityPolicy());
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
}

function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://cloudflareinsights.com https://*.ingest.sentry.io",
  ];
  return directives.join('; ');
}
