import { portfolioListInputSchema } from './portfolio-schemas.ts';
import type {
  AdminPortfolioListPage,
  AdminReviewCollection,
  AdminReviewCollectionDetail,
} from './trpc-types.ts';
import type { AppEnv } from '../env.ts';
import { AppError } from '../http/app-error.ts';
import { PortfolioService } from '../services/portfolio-service.ts';
import { ReviewService } from '../services/review-service.ts';
import { scheduleStalePendingCleanupForAppEnv } from '../trpc/schedule-stale-pending-cleanup.ts';

export async function loadReviewCollectionDetail(
  app: AppEnv,
  id: string,
): Promise<AdminReviewCollectionDetail | null> {
  try {
    return await ReviewService.from(app).getCollectionDetailForAdmin(id);
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export async function loadReviewCollectionsList(app: AppEnv): Promise<AdminReviewCollection[]> {
  return app.d1.reviewCollections.listRecent();
}

export async function loadPortfolioAdminFirstPage(app: AppEnv): Promise<AdminPortfolioListPage> {
  const input = portfolioListInputSchema.parse({ stalePendingOnly: false });
  return PortfolioService.from(app).listForAdminPage(input);
}

/** Parity with tRPC list procedures — fire-and-forget stale pending cleanup when `waitUntil` exists. */
export function scheduleStalePendingCleanupAfterAdminListLoad(
  app: AppEnv,
  waitUntil?: (promise: Promise<unknown>) => void,
): void {
  scheduleStalePendingCleanupForAppEnv(app, waitUntil);
}
