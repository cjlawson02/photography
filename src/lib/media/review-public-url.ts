/** Cache-bust query on stable R2 keys — `updatedAt` changes when variants are reprocessed. */
export function reviewVariantPublicUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return `/media/review/${id}/${variantFile}?v=${updatedAtMs}`;
}

/** Admin delivery — ignores collection expiry (JWT-gated `/admin/api/media/review/...`). */
export function reviewVariantAdminUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return `/admin/api/media/review/${id}/${variantFile}?v=${updatedAtMs}`;
}
