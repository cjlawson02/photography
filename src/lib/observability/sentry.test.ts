import assert from 'node:assert/strict';
import test from 'node:test';

import { sentryOptionsFromEnv, shouldCaptureHttpStatus } from './sentry.ts';

test('sentryOptionsFromEnv returns undefined without DSN', () => {
  assert.equal(sentryOptionsFromEnv({} as Env), undefined);
  assert.equal(sentryOptionsFromEnv({ SENTRY_DSN: '  ' } as Env), undefined);
});

test('sentryOptionsFromEnv passes DSN and optional release', () => {
  assert.deepEqual(sentryOptionsFromEnv({ SENTRY_DSN: 'https://example@o0.ingest/0' } as Env), {
    dsn: 'https://example@o0.ingest/0',
  });
  assert.deepEqual(
    sentryOptionsFromEnv({
      SENTRY_DSN: 'https://example@o0.ingest/0',
      SENTRY_RELEASE: 'photography@abc',
    } as Env),
    {
      dsn: 'https://example@o0.ingest/0',
      release: 'photography@abc',
    },
  );
});

test('shouldCaptureHttpStatus captures 5xx only', () => {
  assert.equal(shouldCaptureHttpStatus(499), false);
  assert.equal(shouldCaptureHttpStatus(500), true);
  assert.equal(shouldCaptureHttpStatus(503), true);
});
