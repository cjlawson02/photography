import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { buildVariantMediaResponse } from '../../../lib/media/build-variant-media-response.ts';
import { isPortfolioMediaAllowed } from '../../../lib/media/portfolio-media-access.ts';
import { PORTFOLIO_VARIANT_CACHE_CONTROL } from '../../../lib/media/portfolio-cache.ts';

export const GET: APIRoute = async ({ params }) => {
  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  return buildVariantMediaResponse({
    path,
    isAllowed: (id) => isPortfolioMediaAllowed(env.DB, id),
    getObject: (r2Key) => env.PORTFOLIO.get(r2Key),
    cacheControl: PORTFOLIO_VARIANT_CACHE_CONTROL,
  });
};
