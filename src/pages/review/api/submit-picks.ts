import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { postReviewSubmitPicks } from '../../../lib/review/post-submit-picks.ts';

/** Client submit picks — link secrecy only (same trust model as selection API). */
export const POST: APIRoute = async ({ request }) =>
  postReviewSubmitPicks({ db: env.DB, rateLimiter: env.REVIEW_SELECTION_RATE_LIMITER }, request);
