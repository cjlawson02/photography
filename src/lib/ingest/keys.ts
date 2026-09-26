/**
 * R2 key prefixes inside each purpose bucket (HLD).
 * Keys are always derived from D1 photo `id` — never stored as a separate column.
 * Variant set is provisional until HLD locks widths/formats.
 */

export const ORIGINAL_SUFFIX = 'original';

/** Provisional ingest variants — not yet locked in HLD. */
export const VARIANT_SPECS = [
  { suffix: 'gallery.webp', width: 1600, contentType: 'image/webp' as const },
  { suffix: 'thumb.webp', width: 400, contentType: 'image/webp' as const },
] as const;

export type VariantSpec = (typeof VARIANT_SPECS)[number];

export function originalKey(id: string): string {
  return `${id}/${ORIGINAL_SUFFIX}`;
}

export function variantKey(id: string, suffix: string): string {
  return `${id}/${suffix}`;
}

/** Allowlisted variant suffixes for future Worker media delivery. */
export function isAllowlistedVariantSuffix(suffix: string): boolean {
  return VARIANT_SPECS.some((v) => v.suffix === suffix);
}
