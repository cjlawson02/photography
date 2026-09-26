import * as Sentry from '@sentry/cloudflare';
import astroHandler from '@astrojs/cloudflare/entrypoints/server';

import { IngestMaintenanceService } from './src/lib/services/ingest-maintenance-service.ts';
import { sentryOptionsFromEnv } from './src/lib/observability/sentry.ts';

const worker = {
  fetch: astroHandler.fetch,
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await IngestMaintenanceService.fromWorkerEnv(env).cleanupStalePending();
          if (result.portfolioRemoved.length || result.reviewRemoved.length) {
            console.log('[ingest-maintenance] removed stale pending rows', result);
          }
        } catch (error) {
          console.error('[ingest-maintenance] scheduled cleanup failed', error);
        }
      })(),
    );
  },
};

export default Sentry.withSentry(sentryOptionsFromEnv, worker);
