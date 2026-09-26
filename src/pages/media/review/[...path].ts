import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { buildVariantMediaResponse } from '../../../lib/media/build-variant-media-response.ts';
import { isReviewMediaAllowed } from '../../../lib/media/review-media-access.ts';
import {
  REVIEW_ROBOTS_HEADER,
  REVIEW_VARIANT_CACHE_CONTROL,
} from '../../../lib/media/review-cache.ts';

export const GET: APIRoute = async ({ params }) => {
  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  return buildVariantMediaResponse({
    path,
    isAllowed: (id) => isReviewMediaAllowed(env.DB, id),
    getObject: (r2Key) => env.REVIEW.get(r2Key),
    cacheControl: REVIEW_VARIANT_CACHE_CONTROL,
    extraHeaders: { 'X-Robots-Tag': REVIEW_ROBOTS_HEADER },
  });
};
