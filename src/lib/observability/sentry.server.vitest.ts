import { describe, expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/cloudflare';

import { scrubSentryEvent, sentryOptionsFromEnv, shouldCaptureHttpStatus } from './sentry.ts';

describe('sentry', () => {
  it('sentryOptionsFromEnv returns undefined without DSN', () => {
    expect(sentryOptionsFromEnv({} as Env)).toBeUndefined();
    expect(sentryOptionsFromEnv({ SENTRY_DSN: '  ' } as Env)).toBeUndefined();
  });

  it('sentryOptionsFromEnv passes DSN and optional release', () => {
    const withoutRelease = sentryOptionsFromEnv({
      SENTRY_DSN: 'https://example@o0.ingest/0',
    } as Env);
    expect(withoutRelease).toBeTruthy();
    expect(withoutRelease!.dsn).toBe('https://example@o0.ingest/0');
    expect(typeof withoutRelease!.beforeSend).toBe('function');

    const withRelease = sentryOptionsFromEnv({
      SENTRY_DSN: 'https://example@o0.ingest/0',
      SENTRY_RELEASE: 'photography@abc',
    } as Env);
    expect(withRelease).toBeTruthy();
    expect(withRelease!.dsn).toBe('https://example@o0.ingest/0');
    expect(withRelease!.release).toBe('photography@abc');
  });

  it('scrubSentryEvent redacts review slug and strips headers', () => {
    const scrubbed = scrubSentryEvent({
      request: {
        url: 'https://photography.chrislawson.dev/review/secret-slug-abc/api?x=1',
        headers: {
          'Cf-Access-Jwt-Assertion': 'live-token',
          'content-type': 'application/json',
        },
      },
    } as unknown as ErrorEvent);

    expect(scrubbed.request?.url).toBe(
      'https://photography.chrislawson.dev/review/[redacted]/api?x=1',
    );
    expect(scrubbed.request?.headers).toBeUndefined();
  });

  it('shouldCaptureHttpStatus captures 5xx only', () => {
    expect(shouldCaptureHttpStatus(499)).toBe(false);
    expect(shouldCaptureHttpStatus(500)).toBe(true);
    expect(shouldCaptureHttpStatus(503)).toBe(true);
  });
});
