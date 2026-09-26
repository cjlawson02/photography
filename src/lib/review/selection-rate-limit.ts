import { AppError } from '../http/app-error.ts';
import { hashString } from '../util/hash-string.ts';

export type ReviewSelectionRateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
}

/** Enforce per-IP limits on public selection updates (Workers rate-limit binding). */
export async function assertReviewSelectionRateLimit(
  limiter: ReviewSelectionRateLimiter | undefined,
  request: Request,
): Promise<void> {
  if (!limiter) return;

  const ip = clientIp(request);
  const hashedIp = await hashString(ip);
  const { success } = await limiter.limit({ key: `selection:${hashedIp}` });
  if (!success) {
    throw new AppError(
      'TOO_MANY_REQUESTS',
      'Too many selection updates. Please wait a moment and try again.',
    );
  }
}
