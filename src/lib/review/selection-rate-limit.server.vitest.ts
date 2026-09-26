import { afterEach, describe, expect, it } from 'vitest';

import { AppError } from '../http/app-error.ts';
import { setRateLimitBindingEnforcementForTests } from '../rate-limit/binding.ts';
import { hashString } from '../util/hash-string.ts';
import { assertReviewSelectionRateLimit } from './selection-rate-limit.ts';

describe('assertReviewSelectionRateLimit', () => {
  afterEach(() => {
    setRateLimitBindingEnforcementForTests(undefined);
  });

  it('no-ops when limiter binding is missing in dev', async () => {
    await assertReviewSelectionRateLimit(undefined, new Request('https://example.com'));
  });

  it('throws SERVICE_UNAVAILABLE when binding missing and enforcement required', async () => {
    setRateLimitBindingEnforcementForTests(true);
    await expect(
      assertReviewSelectionRateLimit(undefined, new Request('https://example.com')),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('passes when limiter allows the request', async () => {
    await assertReviewSelectionRateLimit(
      { limit: async () => ({ success: true }) },
      new Request('https://example.com', { headers: { 'CF-Connecting-IP': '203.0.113.1' } }),
    );
  });

  it('rate limit key uses hashed client IP', async () => {
    let capturedKey = '';
    await assertReviewSelectionRateLimit(
      {
        limit: async ({ key }) => {
          capturedKey = key;
          return { success: true };
        },
      },
      new Request('https://example.com', { headers: { 'CF-Connecting-IP': '203.0.113.1' } }),
    );
    const expected = `selection:${await hashString('203.0.113.1')}`;
    expect(capturedKey).toBe(expected);
  });

  it('throws TOO_MANY_REQUESTS when limiter rejects', async () => {
    await expect(
      assertReviewSelectionRateLimit(
        { limit: async () => ({ success: false }) },
        new Request('https://example.com'),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('TOO_MANY_REQUESTS');
      expect((error as AppError).status).toBe(429);
      return true;
    });
  });
});
