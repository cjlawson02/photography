import { describe, expect, it } from 'vitest';

import { setRateLimitBindingEnforcementForTests } from '../rate-limit/binding.ts';
import { hashString } from '../util/hash-string.ts';
import { appErrorMiddleware } from './middleware.ts';
import { createCallerFactory, createTRPCRouter, publicProcedure } from './init.ts';
import { isLimited } from './rate-limit-middleware.ts';
import type { TrpcContext } from './context.ts';

const limitedProcedure = publicProcedure.use(appErrorMiddleware).use(isLimited);

const testRouter = createTRPCRouter({
  ping: limitedProcedure.query(() => 'pong'),
});

const createCaller = createCallerFactory(testRouter);

function baseContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    request: new Request('http://localhost/admin/api/trpc', {
      headers: { 'CF-Connecting-IP': '203.0.113.55' },
    }),
    accessEnv: { CF_ACCESS_TEAM_DOMAIN: '', CF_ACCESS_AUD: '' },
    ensureAccessIdentity: () => Promise.reject(new Error('stub')),
    getAppEnv: () => {
      throw new Error('stub');
    },
    getIngestAppEnv: () => {
      throw new Error('stub');
    },
    getAdminTrpcRateLimiter: () => undefined,
    ...overrides,
  };
}

describe('isLimited', () => {
  it('skips when admin rate limiter binding is missing', async () => {
    const caller = createCaller(baseContext());
    await expect(caller.ping()).resolves.toBe('pong');
  });

  it('returns SERVICE_UNAVAILABLE when binding missing and enforcement required', async () => {
    setRateLimitBindingEnforcementForTests(true);
    const caller = createCaller(baseContext());
    await expect(caller.ping()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    setRateLimitBindingEnforcementForTests(undefined);
  });

  it('uses Access email in the rate-limit key', async () => {
    let capturedKey = '';
    const caller = createCaller(
      baseContext({
        accessIdentity: { email: 'admin@example.com', payload: { sub: 'sub-1' } },
        getAdminTrpcRateLimiter: () => ({
          limit: async ({ key }) => {
            capturedKey = key;
            return { success: true };
          },
        }),
      }),
    );

    await caller.ping();
    expect(capturedKey).toBe('ping_admin@example.com');
  });

  it('falls back to JWT sub when email is absent', async () => {
    let capturedKey = '';
    const caller = createCaller(
      baseContext({
        accessIdentity: { payload: { sub: 'access-subject-42' } },
        getAdminTrpcRateLimiter: () => ({
          limit: async ({ key }) => {
            capturedKey = key;
            return { success: true };
          },
        }),
      }),
    );

    await caller.ping();
    expect(capturedKey).toBe('ping_access-subject-42');
  });

  it('hashes CF-Connecting-IP when identity is missing', async () => {
    let capturedKey = '';
    const caller = createCaller(
      baseContext({
        getAdminTrpcRateLimiter: () => ({
          limit: async ({ key }) => {
            capturedKey = key;
            return { success: true };
          },
        }),
      }),
    );

    await caller.ping();
    const expectedIp = await hashString('203.0.113.55');
    expect(capturedKey).toBe(`ping_${expectedIp}`);
  });

  it('throws TOO_MANY_REQUESTS when limiter rejects', async () => {
    const caller = createCaller(
      baseContext({
        accessIdentity: { email: 'admin@example.com', payload: {} },
        getAdminTrpcRateLimiter: () => ({
          limit: async () => ({ success: false }),
        }),
      }),
    );

    await expect(caller.ping()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});
