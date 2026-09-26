import { describe, expect, it } from 'vitest';

import {
  decodeAdminListCursor,
  encodeAdminListCursor,
  type AdminListCursor,
} from './admin-list-cursor.ts';

describe('admin list cursor', () => {
  const sample: AdminListCursor = { updatedAt: 1_700_000_000_000, id: 'clxyz123' };

  it('round-trips encode/decode', () => {
    const encoded = encodeAdminListCursor(sample);
    expect(decodeAdminListCursor(encoded)).toEqual(sample);
  });

  it('returns null for garbage', () => {
    expect(decodeAdminListCursor('not-valid')).toBeNull();
    expect(decodeAdminListCursor(btoa(JSON.stringify({ updatedAt: 'x', id: 1 })))).toBeNull();
  });
});
