import * as Sentry from '@sentry/cloudflare';
import type { CloudflareOptions } from '@sentry/cloudflare';

function configuredSecret(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Worker `withSentry` options — returns `undefined` when DSN unset (dev no-op). */
export function sentryOptionsFromEnv(env: Env): CloudflareOptions | undefined {
  const dsn = configuredSecret(env.SENTRY_DSN);
  if (!dsn) return undefined;

  const release = configuredSecret(env.SENTRY_RELEASE);
  return {
    dsn,
    ...(release ? { release } : {}),
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
