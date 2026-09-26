import { describe, expect, it } from 'vitest';

import {
  isStalePendingIngest,
  PENDING_INGEST_STALE_MS,
  pendingIngestStaleCutoffMs,
  PRESIGN_PUT_EXPIRES_SECONDS,
} from './stale-pending.ts';

describe('stale pending ingest', () => {
  it('uses presign TTL plus one hour grace', () => {
    expect(PENDING_INGEST_STALE_MS).toBe(PRESIGN_PUT_EXPIRES_SECONDS * 1000 + 60 * 60 * 1000);
  });

  it('marks rows older than cutoff as stale', () => {
    const now = 1_700_000_000_000;
    const cutoff = pendingIngestStaleCutoffMs(now);
    expect(isStalePendingIngest(cutoff, now)).toBe(true);
    expect(isStalePendingIngest(cutoff + 1, now)).toBe(false);
  });
});
