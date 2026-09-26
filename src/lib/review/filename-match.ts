const EXTENSION_PATTERN = /\.[^./\\]+$/;

/** One trailing Lightroom / Photoshop export token: `-Edit`, `_edit`, `-2`, ` copy`, ` copy 2`. */
const EXPORT_SUFFIX_PATTERN = /(?:[ _-]edit| copy(?: \d+)?|-\d{1,2})$/;

/** Drop the last extension (`DSC_1234.CR3` → `DSC_1234`); returns the input when nothing is left. */
export function stripFilenameExtension(value: string): string {
  const base = value.replace(EXTENSION_PATTERN, '');
  return base.length > 0 ? base : value;
}

/** Case-insensitive basename without extension — the key proofs are compared on. */
export function normalizeReviewFilename(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return stripFilenameExtension(trimmed).toLocaleLowerCase();
}

/**
 * Keys to try for a final, most specific first: the normalized basename, then with export
 * suffixes peeled one at a time (`dsc_1234-edit-2` → `dsc_1234-edit` → `dsc_1234`).
 */
export function finalFilenameMatchKeys(value: string | null | undefined): string[] {
  const base = normalizeReviewFilename(value);
  if (!base) return [];
  const keys = [base];
  let current = base;
  for (;;) {
    const next = current.replace(EXPORT_SUFFIX_PATTERN, '');
    if (next === current || next.length === 0) break;
    keys.push(next);
    current = next;
  }
  return keys;
}
