import { parseJsonBody, REVIEW_SELECTION_MAX_JSON_BYTES } from '../admin/http.ts';
import { ensureAppError, toErrorResponse } from '../http/app-error.ts';
import { reviewSelectionBodySchema } from './public-schemas.ts';
import { assertReviewSelectionRateLimit } from './selection-rate-limit.ts';
import type { updateReviewSelection } from './update-selection.ts';

export type ReviewSelectionBindings = {
  db: D1Database;
  rateLimiter: Cloudflare.Env['REVIEW_SELECTION_RATE_LIMITER'] | undefined;
  /** Test seam — avoids loading D1 DAO modules under node strip-only tests. */
  mutateSelection?: typeof updateReviewSelection;
};

let defaultMutateSelection: typeof updateReviewSelection | undefined;

async function resolveMutateSelection(
  override: ReviewSelectionBindings['mutateSelection'],
): Promise<typeof updateReviewSelection> {
  if (override) return override;
  defaultMutateSelection ??= (await import('./update-selection.ts')).updateReviewSelection;
  return defaultMutateSelection;
}

/** POST `/review/api/selection` — rate limit, JSON body, D1 mutation. */
export async function postReviewSelection(
  bindings: ReviewSelectionBindings,
  request: Request,
): Promise<Response> {
  try {
    await assertReviewSelectionRateLimit(bindings.rateLimiter, request);
    const body = await parseJsonBody(request, reviewSelectionBodySchema, {
      maxBytes: REVIEW_SELECTION_MAX_JSON_BYTES,
    });
    const mutate = await resolveMutateSelection(bindings.mutateSelection);
    await ensureAppError(async () => mutate(bindings.db, body));
    // Do not echo the D1 row (FIX-40); client already knows the intended selectionStatus.
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
