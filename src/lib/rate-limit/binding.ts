import { AppError } from '../http/app-error.ts';

export type RateLimiterBinding = {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
};

let enforcementOverride: boolean | undefined;

/** Test seam — when set, overrides `import.meta.env.PROD` for rate-limit binding checks. */
export function setRateLimitBindingEnforcementForTests(value: boolean | undefined): void {
  enforcementOverride = value;
}

function isViteProdBuild(): boolean {
  const env = (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env;
  return env?.PROD === true;
}

/** Production Workers must have wrangler `ratelimits` bindings deployed (FIX-02). */
export function isRateLimitBindingRequired(): boolean {
  if (enforcementOverride !== undefined) return enforcementOverride;
  return isViteProdBuild();
}

export function isRateLimiterBinding(value: unknown): value is RateLimiterBinding {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as RateLimiterBinding).limit === 'function'
  );
}

/**
 * Return the limiter or no-op in dev/test when unset.
 * In production, missing bindings return 503 instead of silently skipping limits.
 */
export function resolveRateLimiterBinding(
  limiter: RateLimiterBinding | undefined,
  bindingName: string,
): RateLimiterBinding | undefined {
  if (isRateLimiterBinding(limiter)) return limiter;
  if (isRateLimitBindingRequired()) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      `${bindingName} rate limiter binding is not configured`,
    );
  }
  return undefined;
}
