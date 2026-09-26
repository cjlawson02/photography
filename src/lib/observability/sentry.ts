import * as Sentry from '@sentry/cloudflare';
import type { CloudflareOptions } from '@sentry/cloudflare';

import { sentryClientConfigFromEnv } from './sentry-config.ts';

/** Worker `withSentry` options — returns `undefined` when DSN unset (dev no-op). */
export function sentryOptionsFromEnv(env: Env): CloudflareOptions | undefined {
  const client = sentryClientConfigFromEnv(env);
  if (!client) return undefined;

  return {
    dsn: client.dsn,
    ...(client.release ? { release: client.release } : {}),
  };
}

export function shouldCaptureHttpStatus(status: number): boolean {
  return status >= 500;
}

export function captureWorkerException(
  error: unknown,
  context?: { tags?: Record<string, string> },
): void {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
