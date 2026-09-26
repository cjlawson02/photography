import type { ReviewJobStatus } from '../../db/schema/review/job-status.ts';

const PICKS_LOCKED_STATUSES: ReviewJobStatus[] = [
  'picks_submitted',
  'editing',
  'finals_delivered',
  'closed',
];

export function areClientPicksLocked(status: ReviewJobStatus): boolean {
  return PICKS_LOCKED_STATUSES.includes(status);
}

export function countSubmittedPicks(
  photos: { selectionStatus: 'none' | 'selected' | 'approved' }[],
): number {
  return photos.filter(
    (photo) => photo.selectionStatus === 'selected' || photo.selectionStatus === 'approved',
  ).length;
}
