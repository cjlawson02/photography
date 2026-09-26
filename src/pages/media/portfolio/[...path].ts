import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { parsePortfolioMediaPath } from '../../../lib/media/parse-portfolio-media-path.ts';
import { isPortfolioMediaAllowed } from '../../../lib/media/portfolio-media-access.ts';
import { PORTFOLIO_VARIANT_CACHE_CONTROL } from '../../../lib/media/portfolio-cache.ts';

export const GET: APIRoute = async ({ params }) => {
  const raw = params.path;
  const path = typeof raw === 'string' ? raw : '';

  const parsed = parsePortfolioMediaPath(path);
  if (!parsed.ok) {
    return new Response('Not Found', { status: 404 });
  }

  const allowed = await isPortfolioMediaAllowed(env.DB, parsed.id);
  if (!allowed) {
    return new Response('Not Found', { status: 404 });
  }

  const object = await env.PORTFOLIO.get(parsed.r2Key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Cache-Control', PORTFOLIO_VARIANT_CACHE_CONTROL);
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
