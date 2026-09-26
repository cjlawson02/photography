import { AppError } from '../http/app-error.ts';
import { resolveRateLimiterBinding, type RateLimiterBinding } from '../rate-limit/binding.ts';
import { hashString } from '../util/hash-string.ts';

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
}

/** Enforce per-IP limits on public selection updates (Workers rate-limit binding). */
export async function assertReviewSelectionRateLimit(
  limiter: Cloudflare.Env['REVIEW_SELECTION_RATE_LIMITER'] | undefined,
  request: Request,
): Promise<void> {
  const resolved = resolveRateLimiterBinding(
    limiter as RateLimiterBinding | undefined,
    'REVIEW_SELECTION_RATE_LIMITER',
  );
  if (!resolved) return;

  const ip = clientIp(request);
  const hashedIp = await hashString(ip);
  const { success } = await resolved.limit({ key: `selection:${hashedIp}` });
  if (!success) {
    throw new AppError(
      'TOO_MANY_REQUESTS',
      'Too many selection updates. Please wait a moment and try again.',
    );
  }
}
