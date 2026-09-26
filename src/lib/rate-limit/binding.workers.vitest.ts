import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { isRateLimiterBinding } from './binding.ts';

describe('rate limit bindings (workerd)', () => {
  it('exposes REVIEW_SELECTION_RATE_LIMITER from wrangler ratelimits', () => {
    expect(isRateLimiterBinding(env.REVIEW_SELECTION_RATE_LIMITER)).toBe(true);
  });

  it('exposes ADMIN_TRPC_RATE_LIMITER from wrangler ratelimits', () => {
    expect(isRateLimiterBinding(env.ADMIN_TRPC_RATE_LIMITER)).toBe(true);
  });
});
