import type { D1DAO } from '../dao/index.ts';
import type { R2DAO } from '../dao/r2-dao.ts';
import type { PurposeBucket } from '../dao/r2-dao.ts';
import { photoIngestObjectKeys } from '../ingest/keys.ts';
import { pendingIngestStaleCutoffMs } from '../ingest/stale-pending.ts';
import type { AppEnv } from '../env.ts';
import { createDb } from '../../db/client.ts';
import { D1DAO as D1DAOClass } from '../dao/index.ts';
import { R2DAO as R2DAOClass } from '../dao/r2-dao.ts';
import { getCloudflareBindings } from '../cloudflare-env.ts';

export type StalePendingCleanupResult = {
  cutoffMs: number;
  portfolioRemoved: string[];
  reviewRemoved: string[];
};

/**
 * Removes long-stuck `pending` ingest rows and best-effort R2 keys for those photo ids.
 * Uses Worker R2 bindings only (no presign S3 secrets).
 */
export class IngestMaintenanceService {
  constructor(
    private readonly d1: D1DAO,
    private readonly r2: R2DAO,
  ) {}

  /** Bindings-only bootstrap (scheduled cron + admin cleanup; no R2 S3 secrets). */
  static fromAppEnv(app: AppEnv): IngestMaintenanceService {
    return new IngestMaintenanceService(app.d1, app.r2);
  }

  static fromWorkerEnv(raw: unknown): IngestMaintenanceService {
    const bindings = getCloudflareBindings(raw);
    const d1 = D1DAOClass.getInstance(createDb(bindings.DB));
    const r2 = R2DAOClass.getBindingsInstance({
      PORTFOLIO: bindings.PORTFOLIO,
      REVIEW: bindings.REVIEW,
    });
    return new IngestMaintenanceService(d1, r2);
  }

  async cleanupStalePending(options?: {
    limitPerDomain?: number;
    nowMs?: number;
  }): Promise<StalePendingCleanupResult> {
    const nowMs = options?.nowMs ?? Date.now();
    const cutoffMs = pendingIngestStaleCutoffMs(nowMs);
    const limit = options?.limitPerDomain ?? 100;

    const portfolioRows = await this.d1.portfolioPhotos.listPendingCreatedBefore(cutoffMs, limit);
    const reviewRows = await this.d1.reviewPhotos.listPendingCreatedBefore(cutoffMs, limit);

    const portfolioRemoved: string[] = [];
    for (const row of portfolioRows) {
      await this.removePendingPhoto('portfolio', row.id);
      portfolioRemoved.push(row.id);
    }

    const reviewRemoved: string[] = [];
    for (const row of reviewRows) {
      await this.removePendingPhoto('review', row.id);
      reviewRemoved.push(row.id);
    }

    return { cutoffMs, portfolioRemoved, reviewRemoved };
  }

  private async removePendingPhoto(bucket: PurposeBucket, id: string): Promise<void> {
    try {
      await this.r2.deleteObjects(bucket, photoIngestObjectKeys(id));
    } catch (error) {
      console.error('[ingest-maintenance] R2 cleanup failed', { bucket, id, error });
    }

    if (bucket === 'portfolio') {
      await this.d1.portfolioPhotos.deleteById(id);
    } else {
      await this.d1.reviewPhotos.deleteById(id);
    }
  }
}
