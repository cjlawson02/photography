import { isAllowlistedVariantSuffix } from '../ingest/keys.ts';

export type ParsedMediaPath =
  | { ok: true; id: string; variantSuffix: string; r2Key: string }
  | { ok: false; reason: 'empty' | 'invalid_shape' | 'disallowed_variant' };

/**
 * `/media/{scope}/{id}/{variant}` — id is a single segment; variant is an allowlisted suffix
 * (e.g. gallery.webp). Same shape for portfolio, public review, and admin review delivery.
 */
export function parseMediaPath(path: string | undefined): ParsedMediaPath {
  if (!path?.trim()) {
    return { ok: false, reason: 'empty' };
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return { ok: false, reason: 'invalid_shape' };
  }

  const [id, variantSuffix] = segments;
  if (!id || !variantSuffix || !isAllowlistedVariantSuffix(variantSuffix)) {
    return { ok: false, reason: 'disallowed_variant' };
  }

  return { ok: true, id, variantSuffix, r2Key: `${id}/${variantSuffix}` };
}
