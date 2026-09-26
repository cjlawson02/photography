/** Presigned PUT lifetime (see `R2DAO` default) — rows stuck pending longer are stale. */
export const PRESIGN_PUT_EXPIRES_SECONDS = 3600;

/** Grace after presign expiry before automatic cleanup (slow uploads + clock skew). */
export const PENDING_INGEST_STALE_GRACE_MS = 60 * 60 * 1000;

/** Pending rows with `createdAt` before `now - this` are eligible for cleanup. */
export const PENDING_INGEST_STALE_MS =
  PRESIGN_PUT_EXPIRES_SECONDS * 1000 + PENDING_INGEST_STALE_GRACE_MS;

export function pendingIngestStaleCutoffMs(nowMs = Date.now()): number {
  return nowMs - PENDING_INGEST_STALE_MS;
}

export function isStalePendingIngest(createdAtMs: number, nowMs = Date.now()): boolean {
  return createdAtMs <= pendingIngestStaleCutoffMs(nowMs);
}
