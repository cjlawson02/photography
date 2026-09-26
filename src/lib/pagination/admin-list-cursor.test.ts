import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeAdminListCursor,
  encodeAdminListCursor,
  type AdminListCursor,
} from './admin-list-cursor.ts';

describe('admin list cursor', () => {
  const sample: AdminListCursor = { updatedAt: 1_700_000_000_000, id: 'clxyz123' };

  it('round-trips encode/decode', () => {
    const encoded = encodeAdminListCursor(sample);
    assert.deepEqual(decodeAdminListCursor(encoded), sample);
  });

  it('returns null for garbage', () => {
    assert.equal(decodeAdminListCursor('not-valid'), null);
    assert.equal(decodeAdminListCursor(btoa(JSON.stringify({ updatedAt: 'x', id: 1 }))), null);
  });
});
