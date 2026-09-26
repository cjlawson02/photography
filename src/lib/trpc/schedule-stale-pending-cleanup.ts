import type { AppEnv } from '../env.ts';
import { IngestMaintenanceService } from '../services/ingest-maintenance-service.ts';
import type { TrpcContext } from './context.ts';

/** Fire-and-forget stale pending cleanup after admin list loads (no cron). */
export function scheduleStalePendingCleanupForAppEnv(
  app: AppEnv,
  waitUntil?: (promise: Promise<unknown>) => void,
): void {
  if (!waitUntil) return;

  waitUntil(
    (async () => {
      try {
        const result = await IngestMaintenanceService.fromAppEnv(app).cleanupStalePending();
        if (result.portfolioRemoved.length || result.reviewRemoved.length) {
          console.log('[ingest-maintenance] lazy cleanup removed stale pending rows', result);
        }
      } catch (error) {
        console.error('[ingest-maintenance] lazy cleanup failed', error);
      }
    })(),
  );
}

export function scheduleStalePendingCleanup(ctx: TrpcContext): void {
  scheduleStalePendingCleanupForAppEnv(ctx.getAppEnv(), ctx.waitUntil);
}
