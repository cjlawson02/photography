/** Normalize upload basenames for Lightroom export ↔ final matching. */
export function normalizeReviewFilename(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.toLocaleLowerCase();
}

export function filenamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeReviewFilename(a);
  const right = normalizeReviewFilename(b);
  if (!left || !right) return false;
  return left === right;
}
