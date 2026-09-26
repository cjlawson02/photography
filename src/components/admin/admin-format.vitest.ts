import { describe, expect, it } from 'vitest';

import {
  errorMessage,
  formatAdminDimensions,
  formatAdminTime,
  normalizeNullableText,
} from './admin-format.ts';

describe('admin-format', () => {
  it('normalizeNullableText trims and maps empty to null', () => {
    expect(normalizeNullableText('  hi  ')).toBe('hi');
    expect(normalizeNullableText('')).toBeNull();
    expect(normalizeNullableText('   ')).toBeNull();
    expect(normalizeNullableText(null)).toBeNull();
  });

  it('formatAdminDimensions shows em dash when incomplete', () => {
    expect(formatAdminDimensions(1200, 800)).toBe('1200×800');
    expect(formatAdminDimensions(null, 800)).toBe('—');
  });

  it('formatAdminTime formats epoch ms in stable UTC (FIX-31)', () => {
    expect(formatAdminTime(Date.UTC(2024, 0, 15, 12, 0, 0))).toBe('Jan 15, 2024, 12:00 PM UTC');
  });

  it('errorMessage unwraps Error', () => {
    expect(errorMessage(new Error('nope'))).toBe('nope');
    expect(errorMessage('plain')).toBe('plain');
  });
});
