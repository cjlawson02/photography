import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';
import { isReviewDownloadMode } from './collection-access.ts';

/** Banner copy on `/admin/shoots/{id}/preview` — what the client sees right now vs this preview. */
export function downloadPreviewNotice(input: {
  status: ReviewJobStatus;
  expiresAt: number | null;
  nowMs?: number;
}): string {
  const expired = input.expiresAt != null && input.expiresAt <= (input.nowMs ?? Date.now());
  if (expired) {
    return 'The client link has expired — the client sees “This gallery has closed” until you extend it.';
  }
  if (isReviewDownloadMode(input.status)) {
    return 'Finals are delivered — this is what the client sees on their link now.';
  }
  return 'Not delivered yet — the client link still shows their picks. This is what it will show after Mark finals delivered.';
}
