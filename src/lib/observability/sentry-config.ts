/** Shared Sentry env parsing (no SDK imports — safe for browser bundles). */

export function configuredSecret(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export type SentryClientConfig = {
  dsn: string;
  release?: string;
};

/** DSN + optional release for browser or Worker SDK init; `null` when DSN unset. */
export function sentryClientConfigFromEnv(
  env: Pick<Env, 'SENTRY_DSN' | 'SENTRY_RELEASE'>,
): SentryClientConfig | null {
  const dsn = configuredSecret(env.SENTRY_DSN);
  if (!dsn) return null;

  const release = configuredSecret(env.SENTRY_RELEASE);
  return release ? { dsn, release } : { dsn };
}
