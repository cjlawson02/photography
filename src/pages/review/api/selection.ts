import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { parseJsonBody } from '../../../lib/admin/http.ts';
import { ensureAppError, toErrorResponse } from '../../../lib/http/app-error.ts';
import { assertReviewSelectionRateLimit } from '../../../lib/review/selection-rate-limit.ts';
import { reviewSelectionBodySchema } from '../../../lib/review/public-schemas.ts';
import { updateReviewSelection } from '../../../lib/services/review-service.ts';

/**
 * Client selection updates — no Access JWT (phase 1: link secrecy only).
 * Future password gate: verify credential in ReviewService before mutating.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    await assertReviewSelectionRateLimit(env.REVIEW_SELECTION_RATE_LIMITER, request);
    const body = await parseJsonBody(request, reviewSelectionBodySchema);
    const photo = await ensureAppError(async () => updateReviewSelection(env.DB, body));
    return Response.json({ ok: true, photo });
  } catch (error) {
    return toErrorResponse(error);
  }
};
