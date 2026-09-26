/** Cache-bust query on stable R2 keys — `updatedAt` changes when variants are reprocessed. */
export function reviewVariantPublicUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return `/media/review/${id}/${variantFile}?v=${updatedAtMs}`;
}
