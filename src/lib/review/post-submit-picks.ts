import { parseJsonBody, REVIEW_SELECTION_MAX_JSON_BYTES } from '../admin/http.ts';
import { ensureAppError, toErrorResponse } from '../http/app-error.ts';
import { reviewSubmitPicksBodySchema } from './public-schemas.ts';
import { assertReviewSelectionRateLimit } from './selection-rate-limit.ts';
import type { submitClientPicks } from './submit-client-picks.ts';

export type ReviewSubmitPicksBindings = {
  db: D1Database;
  rateLimiter: Cloudflare.Env['REVIEW_SELECTION_RATE_LIMITER'] | undefined;
  submitPicks?: typeof submitClientPicks;
};

let defaultSubmitPicks: typeof submitClientPicks | undefined;

async function resolveSubmitPicks(
  override: ReviewSubmitPicksBindings['submitPicks'],
): Promise<typeof submitClientPicks> {
  if (override) return override;
  defaultSubmitPicks ??= (await import('./submit-client-picks.ts')).submitClientPicks;
  return defaultSubmitPicks;
}

/** POST `/review/api/submit-picks` — rate limit, JSON body, lock picks. */
export async function postReviewSubmitPicks(
  bindings: ReviewSubmitPicksBindings,
  request: Request,
): Promise<Response> {
  try {
    await assertReviewSelectionRateLimit(bindings.rateLimiter, request);
    const body = await parseJsonBody(request, reviewSubmitPicksBodySchema, {
      maxBytes: REVIEW_SELECTION_MAX_JSON_BYTES,
    });
    const submit = await resolveSubmitPicks(bindings.submitPicks);
    const result = await ensureAppError(async () => submit(bindings.db, body.slug));
    return Response.json({
      ok: true,
      pickCount: result.pickCount,
      status: result.collection.status,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
