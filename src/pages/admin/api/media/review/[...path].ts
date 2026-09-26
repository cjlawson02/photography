import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from '../../../../../lib/access/verify-jwt.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { buildAdminReviewMediaResponse } from '../../../../../lib/media/admin-review-media-response.ts';

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

  return buildAdminReviewMediaResponse(path, {
    db: env.DB,
    getReviewObject: (r2Key) => env.REVIEW.get(r2Key),
  });
};

export const prerender = false;
