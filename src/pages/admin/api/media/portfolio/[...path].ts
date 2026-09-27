import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from '../../../../../lib/access/verify-jwt.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { buildAdminPortfolioMediaResponse } from '../../../../../lib/media/admin-portfolio-media-response.ts';

/**
 * Admin portfolio variants — JWT required; serves ready drafts (unpublished) for library thumbs.
 */
export const GET: APIRoute = async ({ params, request }) => {
  try {
    await verifyAccessJwt(request, accessEnvFrom(env));
  } catch (error) {
    return accessDeniedResponse(error);
  }

  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  return buildAdminPortfolioMediaResponse(path, {
    db: env.DB,
    getPortfolioObject: (r2Key) => env.PORTFOLIO.get(r2Key),
  });
};

export const prerender = false;
