import { filenamesMatch } from './filename-match.ts';

export type ReviewPhotoPickCandidate = {
  id: string;
  round: 'proof' | 'final';
  originalFilename: string | null;
};

/** Pick the proof row whose basename matches the final upload, if unique. */
export function findMatchedPickId(
  finalPhoto: { originalFilename: string | null },
  proofs: ReviewPhotoPickCandidate[],
): string | null {
  const proofRows = proofs.filter((row) => row.round === 'proof');
  const matches = proofRows.filter((proof) =>
    filenamesMatch(proof.originalFilename, finalPhoto.originalFilename),
  );
  if (matches.length !== 1) {
    return null;
  }
  return matches[0]!.id;
}
