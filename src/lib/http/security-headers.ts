/**
 * Baseline security headers for HTML and API responses.
 * CSP is pragmatic: bundled scripts from `'self'`, inline styles for Tailwind/Astro,
 * Google Fonts from layout; no script nonces (not used today).
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
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
  ];
  return directives.join('; ');
}
