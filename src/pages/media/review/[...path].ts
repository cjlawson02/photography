import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { buildVariantMediaResponse } from '../../../lib/media/build-variant-media-response.ts';
import { parseMediaPath } from '../../../lib/media/parse-media-path.ts';
import {
  isReviewMediaAllowed,
  reviewOriginalDownloadFilename,
} from '../../../lib/media/review-media-access.ts';
import {
  REVIEW_ROBOTS_HEADER,
  REVIEW_VARIANT_CACHE_CONTROL,
} from '../../../lib/media/review-cache.ts';

export const GET: APIRoute = async ({ params }) => {
  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  const parsedForOriginal = parseMediaPath(path, { allowOriginal: true });
  const allowOriginal = parsedForOriginal.ok && parsedForOriginal.isOriginal;

  return buildVariantMediaResponse({
    path,
    parsePath: (mediaPath) => parseMediaPath(mediaPath, { allowOriginal: true }),
    isAllowed: (id) => isReviewMediaAllowed(env.DB, id, { allowOriginal }),
    getObject: (r2Key) => env.REVIEW.get(r2Key),
    cacheControl: REVIEW_VARIANT_CACHE_CONTROL,
    extraHeaders: { 'X-Robots-Tag': REVIEW_ROBOTS_HEADER },
    contentDispositionFilename: (id) => reviewOriginalDownloadFilename(env.DB, id),
  });
};
