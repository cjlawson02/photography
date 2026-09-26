import { describe, expect, it } from 'vitest';

import { configuredSecret, sentryClientConfigFromEnv } from './sentry-config.ts';

describe('sentry-config', () => {
  it('configuredSecret treats blank as unset', () => {
    expect(configuredSecret(undefined)).toBeUndefined();
    expect(configuredSecret('  ')).toBeUndefined();
    expect(configuredSecret(' x ')).toBe('x');
  });

  it('sentryClientConfigFromEnv returns null without DSN', () => {
    expect(sentryClientConfigFromEnv({} as Env)).toBeNull();
    expect(sentryClientConfigFromEnv({ SENTRY_DSN: '  ' } as Env)).toBeNull();
  });

  it('sentryClientConfigFromEnv passes DSN and optional release', () => {
    expect(sentryClientConfigFromEnv({ SENTRY_DSN: 'https://example@o0.ingest/0' } as Env)).toEqual(
      {
        dsn: 'https://example@o0.ingest/0',
      },
    );
    expect(
      sentryClientConfigFromEnv({
        SENTRY_DSN: 'https://example@o0.ingest/0',
        SENTRY_RELEASE: 'abc123',
      } as Env),
    ).toEqual({ dsn: 'https://example@o0.ingest/0', release: 'abc123' });
  });
});
