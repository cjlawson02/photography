import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from '../../../../../lib/access/verify-jwt.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { parseReviewMediaPath } from '../../../../../lib/media/parse-review-media-path.ts';
import { isReviewMediaAllowedForAdmin } from '../../../../../lib/media/review-media-access.ts';
import {
  ADMIN_REVIEW_VARIANT_CACHE_CONTROL,
  REVIEW_ROBOTS_HEADER,
} from '../../../../../lib/media/review-cache.ts';

/**
 * Admin review variants — JWT required; ignores collection expiry so expired
 * collections remain inspectable (FIX-23).
 */
export const GET: APIRoute = async ({ params, request }) => {
  try {
    await verifyAccessJwt(request, accessEnvFrom(env));
  } catch (error) {
    return accessDeniedResponse(error);
  }

  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  const parsed = parseReviewMediaPath(path);
  if (!parsed.ok) {
    return new Response('Not Found', { status: 404 });
  }

  const allowed = await isReviewMediaAllowedForAdmin(env.DB, parsed.id);
  if (!allowed) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await env.REVIEW.get(parsed.r2Key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', ADMIN_REVIEW_VARIANT_CACHE_CONTROL);
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

export const prerender = false;
