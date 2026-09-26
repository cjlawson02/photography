import { describe, expect, it, vi } from 'vitest';

import { accessDeniedResponse, AccessAuthError } from './verify-jwt.ts';

describe('accessDeniedResponse', () => {
  it('returns a generic Unauthorized body (FIX-37)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = accessDeniedResponse(new AccessAuthError('Missing Cf-Access-Jwt-Assertion'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
