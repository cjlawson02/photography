import assert from 'node:assert/strict';
import test from 'node:test';

import type { ErrorEvent } from '@sentry/cloudflare';

import { scrubSentryEvent, sentryOptionsFromEnv, shouldCaptureHttpStatus } from './sentry.ts';

test('sentryOptionsFromEnv returns undefined without DSN', () => {
  assert.equal(sentryOptionsFromEnv({} as Env), undefined);
  assert.equal(sentryOptionsFromEnv({ SENTRY_DSN: '  ' } as Env), undefined);
});

test('sentryOptionsFromEnv passes DSN and optional release', () => {
  const withoutRelease = sentryOptionsFromEnv({ SENTRY_DSN: 'https://example@o0.ingest/0' } as Env);
  assert.ok(withoutRelease);
  assert.equal(withoutRelease.dsn, 'https://example@o0.ingest/0');
  assert.equal(typeof withoutRelease.beforeSend, 'function');

  const withRelease = sentryOptionsFromEnv({
    SENTRY_DSN: 'https://example@o0.ingest/0',
    SENTRY_RELEASE: 'photography@abc',
  } as Env);
  assert.ok(withRelease);
  assert.equal(withRelease.dsn, 'https://example@o0.ingest/0');
  assert.equal(withRelease.release, 'photography@abc');
});

test('scrubSentryEvent redacts review slug and strips headers', () => {
  const scrubbed = scrubSentryEvent({
    request: {
      url: 'https://photography.chrislawson.dev/review/secret-slug-abc/api?x=1',
      headers: {
        'Cf-Access-Jwt-Assertion': 'live-token',
        'content-type': 'application/json',
      },
    },
  } as unknown as ErrorEvent);

  assert.equal(
    scrubbed.request?.url,
    'https://photography.chrislawson.dev/review/[redacted]/api?x=1',
  );
  assert.equal(scrubbed.request?.headers, undefined);
});

test('shouldCaptureHttpStatus captures 5xx only', () => {
  assert.equal(shouldCaptureHttpStatus(499), false);
  assert.equal(shouldCaptureHttpStatus(500), true);
  assert.equal(shouldCaptureHttpStatus(503), true);
});
