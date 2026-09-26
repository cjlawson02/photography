import { describe, expect, it } from 'vitest';

import { AppError } from '../http/app-error.ts';
import { appErrorToTrpc, trpcErrorToHttpStatus } from './errors.ts';
import { createCallerFactory, createTRPCRouter } from './init.ts';
import { adminProcedure } from './middleware.ts';

describe('tRPC errors', () => {
  it('appErrorToTrpc maps codes', () => {
    const err = appErrorToTrpc(new AppError('NOT_FOUND', 'missing'));
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('missing');
  });

  it('appErrorToTrpc maps SERVICE_UNAVAILABLE to tRPC SERVICE_UNAVAILABLE', () => {
    const err = appErrorToTrpc(new AppError('SERVICE_UNAVAILABLE', 'r2 down'));
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('trpcErrorToHttpStatus mirrors AppError status table', () => {
    expect(trpcErrorToHttpStatus('FORBIDDEN')).toBe(403);
    expect(trpcErrorToHttpStatus('BAD_REQUEST')).toBe(400);
    expect(trpcErrorToHttpStatus('SERVICE_UNAVAILABLE')).toBe(503);
    expect(trpcErrorToHttpStatus('CONFLICT')).toBe(409);
  });
});

const testRouter = createTRPCRouter({
  secret: adminProcedure.query(() => 'ok'),
});

const createTestCaller = createCallerFactory(testRouter);

describe('adminProcedure', () => {
  it('is FORBIDDEN without JWT before AppEnv', async () => {
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

    await expect(caller.secret()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(appEnvResolved).toBe(false);
  });

  it('createCaller smoke — router resolves with stub context', () => {
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
    expect(typeof caller.secret).toBe('function');
  });
});
