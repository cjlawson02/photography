import { describe, expect, it } from 'vitest';

import { guardAdminPathAccess, isAdminPath } from './admin-path-gate.ts';

const accessEnv = {
  CF_ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
  CF_ACCESS_AUD: 'test-audience',
};

describe('isAdminPath', () => {
  it('matches /admin and nested paths only', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/portfolio')).toBe(true);
    expect(isAdminPath('/administration')).toBe(false);
    expect(isAdminPath('/media/review/x/y')).toBe(false);
  });
});

describe('guardAdminPathAccess', () => {
  it('skips non-admin paths', async () => {
    const result = await guardAdminPathAccess(
      new Request('https://photography.example/'),
      '/',
      accessEnv,
    );
    expect(result).toBeNull();
  });

  it('skips when Access env is unset (local dev)', async () => {
    const result = await guardAdminPathAccess(
      new Request('https://photography.example/admin'),
      '/admin',
      { CF_ACCESS_TEAM_DOMAIN: '', CF_ACCESS_AUD: '' },
    );
    expect(result).toBeNull();
  });

  it('returns 403 JSON when JWT is missing on /admin*', async () => {
    const result = await guardAdminPathAccess(
      new Request('https://photography.example/admin/portfolio'),
      '/admin/portfolio',
      accessEnv,
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    await expect(result!.json()).resolves.toEqual({
      ok: false,
      error: 'Missing Cf-Access-Jwt-Assertion',
    });
    expect(result!.headers.get('Content-Security-Policy')).toBeTruthy();
  });
});
