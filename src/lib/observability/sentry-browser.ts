import * as Sentry from '@sentry/react';

import type { SentryClientConfig } from './sentry-config.ts';

export type AdminSentryInitConfig = SentryClientConfig;

export function adminSentryInitOptions(
  config: AdminSentryInitConfig,
): Sentry.BrowserOptions | null {
  const dsn = config.dsn.trim();
  if (!dsn) return null;

  const release = config.release?.trim();
  return {
    dsn,
    ...(release ? { release } : {}),
    environment: import.meta.env.PROD ? 'production' : 'development',
    tracesSampleRate: 0.1,
  };
}

let adminSentryInitialized = false;

/** Idempotent admin `/admin*` browser SDK init — no-op when DSN missing. */
export function initAdminSentry(config: AdminSentryInitConfig): void {
  if (adminSentryInitialized) return;

  const options = adminSentryInitOptions(config);
  if (!options) return;

  adminSentryInitialized = true;
  Sentry.init(options);
}

/** Test-only reset for Vitest. */
export function resetAdminSentryForTests(): void {
  adminSentryInitialized = false;
}
