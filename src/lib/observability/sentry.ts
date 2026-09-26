import * as Sentry from '@sentry/cloudflare';
import type { CloudflareOptions, ErrorEvent } from '@sentry/cloudflare';

import { sentryClientConfigFromEnv } from './sentry-config.ts';

const REVIEW_SLUG_IN_PATH = /\/review\/[^/?#]+/gi;

/** Strip auth headers and redact review slugs from event URLs (slug is the credential). */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const next = { ...event };
  if (next.request) {
    const request = { ...next.request };
    delete request.headers;
    if (typeof request.url === 'string') {
      request.url = request.url.replace(REVIEW_SLUG_IN_PATH, '/review/[redacted]');
    }
    next.request = request;
  }
  return next;
}

/** Worker `withSentry` options — returns `undefined` when DSN unset (dev no-op). */
export function sentryOptionsFromEnv(env: Env): CloudflareOptions | undefined {
  const client = sentryClientConfigFromEnv(env);
  if (!client) return undefined;

  return {
    dsn: client.dsn,
    ...(client.release ? { release: client.release } : {}),
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
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
