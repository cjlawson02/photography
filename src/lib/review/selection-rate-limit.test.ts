import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AppError } from '../http/app-error.ts';
import { hashString } from '../util/hash-string.ts';
import { assertReviewSelectionRateLimit } from './selection-rate-limit.ts';

describe('assertReviewSelectionRateLimit', () => {
  it('no-ops when limiter binding is missing', async () => {
    await assertReviewSelectionRateLimit(undefined, new Request('https://example.com'));
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
    assert.equal(capturedKey, expected);
  });

  it('throws TOO_MANY_REQUESTS when limiter rejects', async () => {
    await assert.rejects(
      () =>
        assertReviewSelectionRateLimit(
          { limit: async () => ({ success: false }) },
          new Request('https://example.com'),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'TOO_MANY_REQUESTS');
        assert.equal(error.status, 429);
        return true;
      },
    );
  });
});
