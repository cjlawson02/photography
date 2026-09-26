import assert from 'node:assert/strict';
import test from 'node:test';

import { TRPCError } from '@trpc/server';

import { hashString } from '../util/hash-string.ts';
import { createCallerFactory, createTRPCRouter, publicProcedure } from './init.ts';
import { isLimited } from './rate-limit-middleware.ts';
import type { TrpcContext } from './context.ts';

const limitedProcedure = publicProcedure.use(isLimited);

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

test('isLimited skips when admin rate limiter binding is missing', async () => {
  const caller = createCaller(baseContext());
  assert.equal(await caller.ping(), 'pong');
});

test('isLimited uses Access email in the rate-limit key', async () => {
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
  assert.equal(capturedKey, 'ping_admin@example.com');
});

test('isLimited falls back to JWT sub when email is absent', async () => {
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
  assert.equal(capturedKey, 'ping_access-subject-42');
});

test('isLimited hashes CF-Connecting-IP when identity is missing', async () => {
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
  assert.equal(capturedKey, `ping_${expectedIp}`);
});

test('isLimited throws TOO_MANY_REQUESTS when limiter rejects', async () => {
  const caller = createCaller(
    baseContext({
      accessIdentity: { email: 'admin@example.com', payload: {} },
      getAdminTrpcRateLimiter: () => ({
        limit: async () => ({ success: false }),
      }),
    }),
  );

  await assert.rejects(
    () => caller.ping(),
    (error: unknown) => {
      assert.ok(error instanceof TRPCError);
      assert.equal(error.code, 'TOO_MANY_REQUESTS');
      return true;
    },
  );
});
