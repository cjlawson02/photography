import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isStalePendingIngest,
  PENDING_INGEST_STALE_MS,
  pendingIngestStaleCutoffMs,
  PRESIGN_PUT_EXPIRES_SECONDS,
} from './stale-pending.ts';

describe('stale pending ingest', () => {
  it('uses presign TTL plus one hour grace', () => {
    assert.equal(PENDING_INGEST_STALE_MS, PRESIGN_PUT_EXPIRES_SECONDS * 1000 + 60 * 60 * 1000);
  });

  it('marks rows older than cutoff as stale', () => {
    const now = 1_700_000_000_000;
    const cutoff = pendingIngestStaleCutoffMs(now);
    assert.equal(isStalePendingIngest(cutoff, now), true);
    assert.equal(isStalePendingIngest(cutoff + 1, now), false);
  });
});
