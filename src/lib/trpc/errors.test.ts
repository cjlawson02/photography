import assert from 'node:assert/strict';
import test from 'node:test';

import { TRPCError } from '@trpc/server';

import { AppError } from '../http/app-error.ts';
import { appErrorToTrpc, trpcErrorToHttpStatus } from './errors.ts';
import { createCallerFactory, createTRPCRouter } from './init.ts';
import { adminProcedure } from './middleware.ts';

test('appErrorToTrpc maps codes', () => {
  const err = appErrorToTrpc(new AppError('NOT_FOUND', 'missing'));
  assert.equal(err.code, 'NOT_FOUND');
  assert.equal(err.message, 'missing');
});

test('appErrorToTrpc maps SERVICE_UNAVAILABLE to tRPC SERVICE_UNAVAILABLE', () => {
  const err = appErrorToTrpc(new AppError('SERVICE_UNAVAILABLE', 'r2 down'));
  assert.equal(err.code, 'SERVICE_UNAVAILABLE');
});

test('trpcErrorToHttpStatus mirrors AppError status table', () => {
  assert.equal(trpcErrorToHttpStatus('FORBIDDEN'), 403);
  assert.equal(trpcErrorToHttpStatus('BAD_REQUEST'), 400);
  assert.equal(trpcErrorToHttpStatus('SERVICE_UNAVAILABLE'), 503);
  assert.equal(trpcErrorToHttpStatus('CONFLICT'), 409);
});

const testRouter = createTRPCRouter({
  secret: adminProcedure.query(() => 'ok'),
});

const createTestCaller = createCallerFactory(testRouter);

test('adminProcedure is FORBIDDEN without JWT before AppEnv', async () => {
  let appEnvResolved = false;
  const caller = createTestCaller({
    request: new Request('http://localhost/admin/api/trpc'),
    accessEnv: {
      CF_ACCESS_TEAM_DOMAIN: 'https://example.cloudflareaccess.com',
      CF_ACCESS_AUD: 'test-aud',
    },
    getAppEnv() {
      appEnvResolved = true;
      throw new Error('AppEnv must not load when unauthenticated');
    },
    getIngestAppEnv() {
      throw new Error('Ingest AppEnv must not load when unauthenticated');
    },
    ensureAccessIdentity() {
      return Promise.reject(new Error('missing jwt'));
    },
    getAdminTrpcRateLimiter: () => undefined,
  });

  await assert.rejects(
    () => caller.secret(),
    (err: unknown) => {
      assert.ok(err instanceof TRPCError);
      assert.equal(err.code, 'FORBIDDEN');
      return true;
    },
  );
  assert.equal(appEnvResolved, false);
});

test('createCaller smoke — router resolves with stub context', () => {
  const ctx = {
    request: new Request('http://localhost/admin/api/trpc'),
    accessEnv: { CF_ACCESS_TEAM_DOMAIN: '', CF_ACCESS_AUD: '' },
    getAppEnv: () => {
      throw new Error('stub');
    },
    getIngestAppEnv: () => {
      throw new Error('stub');
    },
    ensureAccessIdentity: () => Promise.reject(new Error('stub')),
    getAdminTrpcRateLimiter: () => undefined,
  };
  const caller = createTestCaller(ctx);
  assert.equal(typeof caller.secret, 'function');
});
