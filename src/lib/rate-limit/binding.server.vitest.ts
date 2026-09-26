import { afterEach, describe, expect, it } from 'vitest';

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
    expect(isRateLimiterBinding({ limit: async () => ({ success: true }) })).toBe(true);
    expect(isRateLimiterBinding(undefined)).toBe(false);
    expect(isRateLimiterBinding({})).toBe(false);
  });

  it('allows missing binding when enforcement is off', () => {
    setRateLimitBindingEnforcementForTests(false);
    expect(resolveRateLimiterBinding(undefined, 'TEST_RATE_LIMITER')).toBeUndefined();
  });

  it('throws SERVICE_UNAVAILABLE when enforcement is on and binding missing', () => {
    setRateLimitBindingEnforcementForTests(true);
    expect(() => resolveRateLimiterBinding(undefined, 'TEST_RATE_LIMITER')).toThrow(AppError);
    try {
      resolveRateLimiterBinding(undefined, 'TEST_RATE_LIMITER');
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('SERVICE_UNAVAILABLE');
      expect((error as AppError).message).toMatch(/TEST_RATE_LIMITER/);
    }
  });
});
