import { describe, expect, it } from 'vitest';

import { requireAdmin } from './http.ts';

const accessEnv = {
  CF_ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
  CF_ACCESS_AUD: 'test-audience',
};

describe('requireAdmin', () => {
  it('returns 403 when JWT is missing', async () => {
    const result = await requireAdmin(
      new Request('https://photography.example/admin/api/health'),
      accessEnv,
    );
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Missing Cf-Access-Jwt-Assertion',
    });
  });

  it('returns 403 when Access env is unset', async () => {
    const result = await requireAdmin(new Request('https://photography.example/admin/api/health'), {
      CF_ACCESS_TEAM_DOMAIN: '',
      CF_ACCESS_AUD: '',
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});
