import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initMock = vi.hoisted(() => vi.fn());

vi.mock('@sentry/react', () => ({
  init: initMock,
}));

import {
  adminSentryInitOptions,
  initAdminSentry,
  resetAdminSentryForTests,
} from './sentry-browser.ts';

describe('adminSentryInitOptions', () => {
  it('returns null for blank DSN', () => {
    expect(adminSentryInitOptions({ dsn: '  ' })).toBeNull();
  });

  it('includes release and sample rate when configured', () => {
    expect(adminSentryInitOptions({ dsn: 'https://example@o0.ingest/0', release: 'sha' })).toEqual(
      expect.objectContaining({
        dsn: 'https://example@o0.ingest/0',
        release: 'sha',
        tracesSampleRate: 0.1,
      }),
    );
  });
});

describe('initAdminSentry', () => {
  beforeEach(() => {
    initMock.mockClear();
  });

  afterEach(() => {
    resetAdminSentryForTests();
  });

  it('initializes once and no-ops without DSN', () => {
    initAdminSentry({ dsn: '' });
    initAdminSentry({ dsn: 'https://example@o0.ingest/0', release: 'r1' });
    initAdminSentry({ dsn: 'https://example@o0.ingest/0', release: 'r2' });

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://example@o0.ingest/0', release: 'r1' }),
    );
  });
});
