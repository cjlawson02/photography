import { env } from 'cloudflare:workers';

import { accessEnvFrom } from '../cloudflare-env.ts';
import type { AccessIdentity } from '../access/verify-jwt.ts';
import { verifyAccessJwt } from '../access/verify-jwt.ts';
import type { AccessEnv } from '../access/verify-jwt.ts';
import type { AppEnv } from '../env.ts';
import { AppEnv as AppEnvFactory } from '../env.ts';

export type TrpcContext = {
  request: Request;
  accessEnv: AccessEnv;
  /** Cloudflare `waitUntil` when the tRPC route runs on Workers (optional in tests). */
  waitUntil?: (promise: Promise<unknown>) => void;
  /** Set after first successful JWT verify in this HTTP request (batch-safe). */
  accessIdentity?: AccessIdentity;
  ensureAccessIdentity: () => Promise<AccessIdentity>;
  getAppEnv: () => AppEnv;
  getIngestAppEnv: () => AppEnv;
  getAdminTrpcRateLimiter: () => Cloudflare.Env['ADMIN_TRPC_RATE_LIMITER'] | undefined;
};

export function createTrpcContext(input: {
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}): TrpcContext {
  let appEnv: AppEnv | undefined;
  let ingestAppEnv: AppEnv | undefined;
  const accessEnv = accessEnvFrom(env);
  let accessIdentity: AccessIdentity | undefined;
  let verifyPromise: Promise<AccessIdentity> | undefined;

  const ctx: TrpcContext = {
    request: input.request,
    waitUntil: input.waitUntil,
    accessEnv,
    accessIdentity,
    ensureAccessIdentity() {
      if (accessIdentity) {
        return Promise.resolve(accessIdentity);
      }
      verifyPromise ??= verifyAccessJwt(input.request, accessEnv).then((identity) => {
        accessIdentity = identity;
        ctx.accessIdentity = identity;
        return identity;
      });
      return verifyPromise;
    },
    getAppEnv() {
      appEnv ??= AppEnvFactory.fromBindings(env);
      return appEnv;
    },
    getIngestAppEnv() {
      ingestAppEnv ??= AppEnvFactory.from(env);
      return ingestAppEnv;
    },
    getAdminTrpcRateLimiter() {
      return env.ADMIN_TRPC_RATE_LIMITER;
    },
  };

  return ctx;
}
