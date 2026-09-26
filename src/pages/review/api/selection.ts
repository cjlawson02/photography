import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { postReviewSelection } from '../../../lib/review/post-selection.ts';

/**
 * Client selection updates — no Access JWT (phase 1: link secrecy only).
 * Future password gate: verify credential in ReviewService before mutating.
 */
export const POST: APIRoute = async ({ request }) =>
  postReviewSelection({ db: env.DB, rateLimiter: env.REVIEW_SELECTION_RATE_LIMITER }, request);
