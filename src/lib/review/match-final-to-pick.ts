import type { ReviewPhotoRound } from '../../db/schema/review/round.ts';
import type { SelectionStatus } from '../../db/schema/review/selection-status.ts';
import { finalFilenameMatchKeys, normalizeReviewFilename } from './filename-match.ts';

export type ReviewPhotoPickCandidate = {
  id: string;
  round: ReviewPhotoRound;
  selectionStatus: SelectionStatus;
  originalFilename: string | null;
};

function isPick(row: ReviewPhotoPickCandidate): boolean {
  return (
    row.round === 'proof' &&
    (row.selectionStatus === 'selected' || row.selectionStatus === 'approved')
  );
}

/**
 * Match a final upload to exactly one client pick by filename. Tries the exact basename first,
 * then peels export suffixes; the first key that hits decides — more than one pick is ambiguous
 * and stays unmatched for manual linking.
 */
export function findMatchedPickId(
  finalPhoto: { originalFilename: string | null },
  rows: ReviewPhotoPickCandidate[],
): string | null {
  const picks = rows
    .filter(isPick)
    .map((row) => ({ id: row.id, key: normalizeReviewFilename(row.originalFilename) }))
    .filter((row): row is { id: string; key: string } => row.key !== null);

  for (const key of finalFilenameMatchKeys(finalPhoto.originalFilename)) {
    const matches = picks.filter((pick) => pick.key === key);
    if (matches.length === 1) return matches[0]!.id;
    if (matches.length > 1) return null;
  }
  return null;
}
