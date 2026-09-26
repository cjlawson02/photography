import assert from 'node:assert/strict';
import { test } from 'node:test';

import { configuredSecret, sentryClientConfigFromEnv } from './sentry-config.ts';

test('configuredSecret treats blank as unset', () => {
  assert.equal(configuredSecret(undefined), undefined);
  assert.equal(configuredSecret('  '), undefined);
  assert.equal(configuredSecret(' x '), 'x');
});

test('sentryClientConfigFromEnv returns null without DSN', () => {
  assert.equal(sentryClientConfigFromEnv({} as Env), null);
  assert.equal(sentryClientConfigFromEnv({ SENTRY_DSN: '  ' } as Env), null);
});

test('sentryClientConfigFromEnv passes DSN and optional release', () => {
  assert.deepEqual(
    sentryClientConfigFromEnv({ SENTRY_DSN: 'https://example@o0.ingest/0' } as Env),
    {
      dsn: 'https://example@o0.ingest/0',
    },
  );
  assert.deepEqual(
    sentryClientConfigFromEnv({
      SENTRY_DSN: 'https://example@o0.ingest/0',
      SENTRY_RELEASE: 'abc123',
    } as Env),
    { dsn: 'https://example@o0.ingest/0', release: 'abc123' },
  );
});
