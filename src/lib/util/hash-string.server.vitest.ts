import { describe, expect, it } from 'vitest';

import { hashString } from './hash-string.ts';

describe('hashString', () => {
  it('is deterministic for the same input', async () => {
    const a = await hashString('203.0.113.1');
    const b = await hashString('203.0.113.1');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs for different inputs', async () => {
    const a = await hashString('203.0.113.1');
    const b = await hashString('203.0.113.2');
    expect(a).not.toBe(b);
  });
});
