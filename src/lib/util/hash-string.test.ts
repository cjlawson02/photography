import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hashString } from './hash-string.ts';

describe('hashString', () => {
  it('is deterministic for the same input', async () => {
    const a = await hashString('203.0.113.1');
    const b = await hashString('203.0.113.1');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it('differs for different inputs', async () => {
    const a = await hashString('203.0.113.1');
    const b = await hashString('203.0.113.2');
    assert.notEqual(a, b);
  });
});
