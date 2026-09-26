import { buildVariantMediaResponse, type MediaObject } from './build-variant-media-response.ts';
import { parseMediaPath } from './parse-media-path.ts';
import {
  isReviewMediaAllowedForAdmin,
  reviewOriginalDownloadFilename,
} from './review-media-access.ts';
import { ADMIN_REVIEW_VARIANT_CACHE_CONTROL, REVIEW_ROBOTS_HEADER } from './review-cache.ts';

export type AdminReviewMediaDeps = {
  db: D1Database;
  getReviewObject: (r2Key: string) => Promise<MediaObject | null>;
};

/** Shared logic for `GET /admin/api/media/review/{id}/{variant|original}` (JWT verified by route). */
export async function buildAdminReviewMediaResponse(
  path: string,
  deps: AdminReviewMediaDeps,
): Promise<Response> {
  const parsed = parseMediaPath(path, { allowOriginal: true });
  const allowOriginal = parsed.ok && parsed.isOriginal;
  return buildVariantMediaResponse({
    path,
    parsePath: (mediaPath) => parseMediaPath(mediaPath, { allowOriginal: true }),
    isAllowed: (id) => isReviewMediaAllowedForAdmin(deps.db, id, { allowOriginal }),
    getObject: deps.getReviewObject,
    cacheControl: ADMIN_REVIEW_VARIANT_CACHE_CONTROL,
    extraHeaders: { 'X-Robots-Tag': REVIEW_ROBOTS_HEADER },
    contentDispositionFilename: (id) => reviewOriginalDownloadFilename(deps.db, id),
  });
}
