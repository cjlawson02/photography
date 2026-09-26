import { IngestMaintenanceService } from '../services/ingest-maintenance-service.ts';
import type { TrpcContext } from './context.ts';

/** Fire-and-forget stale pending cleanup after admin list loads (no cron). */
export function scheduleStalePendingCleanup(ctx: TrpcContext): void {
  const waitUntil = ctx.waitUntil;
  if (!waitUntil) return;

  waitUntil(
    (async () => {
      try {
        const result = await IngestMaintenanceService.fromAppEnv(
          ctx.getAppEnv(),
        ).cleanupStalePending();
        if (result.portfolioRemoved.length || result.reviewRemoved.length) {
          console.log('[ingest-maintenance] lazy cleanup removed stale pending rows', result);
        }
      } catch (error) {
        console.error('[ingest-maintenance] lazy cleanup failed', error);
      }
    })(),
  );
}
