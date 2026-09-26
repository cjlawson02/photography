import { describe, expect, it } from 'vitest';

import { applySecurityHeaders } from './security-headers.ts';

describe('applySecurityHeaders', () => {
  it('sets baseline security headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);

    const csp = headers.get('Content-Security-Policy');
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain('https://static.cloudflareinsights.com');
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('includes Google Fonts and connect-src self in CSP', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);

    const csp = headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain('https://cloudflareinsights.com');
    expect(csp).toContain('https://*.ingest.sentry.io');
    expect(csp).toContain('https://*.ingest.us.sentry.io');
    expect(csp).toContain("img-src 'self' data: blob:");
  });
});
