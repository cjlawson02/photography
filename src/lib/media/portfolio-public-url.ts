/** Cache-bust query on stable R2 keys — `updatedAt` changes when variants are reprocessed. */
export function portfolioVariantPublicUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return `/media/portfolio/${id}/${variantFile}?v=${updatedAtMs}`;
}
