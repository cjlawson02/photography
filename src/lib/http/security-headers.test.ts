import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applySecurityHeaders } from './security-headers.ts';

describe('applySecurityHeaders', () => {
  it('sets baseline security headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);

    const csp = headers.get('Content-Security-Policy');
    assert.ok(csp?.includes("script-src 'self'"));
    assert.ok(csp?.includes("style-src 'self' 'unsafe-inline'"));
    assert.ok(csp?.includes("frame-ancestors 'none'"));
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
  });

  it('includes Google Fonts and connect-src self in CSP', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);

    const csp = headers.get('Content-Security-Policy') ?? '';
    assert.ok(csp.includes('https://fonts.googleapis.com'));
    assert.ok(csp.includes('https://fonts.gstatic.com'));
    assert.ok(csp.includes("connect-src 'self'"));
    assert.ok(csp.includes("img-src 'self' data: blob:"));
  });
});
