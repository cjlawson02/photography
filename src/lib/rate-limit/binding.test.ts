import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { AppError } from '../http/app-error.ts';
import {
  isRateLimiterBinding,
  resolveRateLimiterBinding,
  setRateLimitBindingEnforcementForTests,
} from './binding.ts';

describe('rate limit binding', () => {
  afterEach(() => {
    setRateLimitBindingEnforcementForTests(undefined);
  });

  it('detects limiter-shaped bindings', () => {
    assert.equal(isRateLimiterBinding({ limit: async () => ({ success: true }) }), true);
    assert.equal(isRateLimiterBinding(undefined), false);
    assert.equal(isRateLimiterBinding({}), false);
  });

  it('allows missing binding when enforcement is off', () => {
    setRateLimitBindingEnforcementForTests(false);
    assert.equal(resolveRateLimiterBinding(undefined, 'TEST_RATE_LIMITER'), undefined);
  });

  it('throws SERVICE_UNAVAILABLE when enforcement is on and binding missing', () => {
    setRateLimitBindingEnforcementForTests(true);
    assert.throws(
      () => resolveRateLimiterBinding(undefined, 'TEST_RATE_LIMITER'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'SERVICE_UNAVAILABLE');
        assert.match(error.message, /TEST_RATE_LIMITER/);
        return true;
      },
    );
  });
});
