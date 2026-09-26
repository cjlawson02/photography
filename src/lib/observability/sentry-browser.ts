import * as Sentry from '@sentry/react';

import type { SentryBrowserClientConfig } from './sentry.ts';

let initialized = false;

/** Idempotent init for admin React islands (no-op without DSN). */
export function initAdminBrowserSentry(config: SentryBrowserClientConfig): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  Sentry.init({
    dsn: config.dsn,
    ...(config.release ? { release: config.release } : {}),
    environment: import.meta.env.PROD ? 'production' : 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0,
  });
}
