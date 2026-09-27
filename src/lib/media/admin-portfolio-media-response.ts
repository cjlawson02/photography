import { buildVariantMediaResponse, type MediaObject } from './build-variant-media-response.ts';
import { isPortfolioMediaAllowedForAdmin } from './portfolio-media-access.ts';
import {
  ADMIN_PORTFOLIO_VARIANT_CACHE_CONTROL,
  PORTFOLIO_ROBOTS_HEADER,
} from './portfolio-cache.ts';

export type AdminPortfolioMediaDeps = {
  db: D1Database;
  getPortfolioObject: (r2Key: string) => Promise<MediaObject | null>;
};

/** Shared logic for `GET /admin/api/media/portfolio/{id}/{variant}` (JWT verified by route). */
export async function buildAdminPortfolioMediaResponse(
  path: string,
  deps: AdminPortfolioMediaDeps,
): Promise<Response> {
  return buildVariantMediaResponse({
    path,
    isAllowed: (id) => isPortfolioMediaAllowedForAdmin(deps.db, id),
    getObject: deps.getPortfolioObject,
    cacheControl: ADMIN_PORTFOLIO_VARIANT_CACHE_CONTROL,
    extraHeaders: { 'X-Robots-Tag': PORTFOLIO_ROBOTS_HEADER },
  });
}
