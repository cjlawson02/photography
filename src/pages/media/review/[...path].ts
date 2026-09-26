import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { parseReviewMediaPath } from '../../../lib/media/parse-review-media-path.ts';
import {
  REVIEW_ROBOTS_HEADER,
  REVIEW_VARIANT_CACHE_CONTROL,
} from '../../../lib/media/review-cache.ts';

export const GET: APIRoute = async ({ params }) => {
  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  const parsed = parseReviewMediaPath(path);
  if (!parsed.ok) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await env.REVIEW.get(parsed.r2Key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', REVIEW_VARIANT_CACHE_CONTROL);
  headers.set('X-Robots-Tag', REVIEW_ROBOTS_HEADER);
  const contentType = object.httpMetadata?.contentType;
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  const etag = object.httpEtag;
  if (etag) {
    headers.set('ETag', etag);
  }

  return new Response(object.body, { status: 200, headers });
};
