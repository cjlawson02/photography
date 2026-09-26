export type MediaUrlScope = 'portfolio' | 'review' | 'admin-review';

const SCOPE_PREFIX: Record<MediaUrlScope, string> = {
  portfolio: '/media/portfolio',
  review: '/media/review',
  'admin-review': '/admin/api/media/review',
};

/** Cache-bust query on stable R2 keys — `updatedAt` changes when variants are reprocessed. */
export function variantMediaUrl(options: {
  scope: MediaUrlScope;
  id: string;
  variant: string;
  updatedAtMs: number;
}): string {
  const { scope, id, variant, updatedAtMs } = options;
  return `${SCOPE_PREFIX[scope]}/${id}/${variant}?v=${updatedAtMs}`;
}

export function portfolioVariantPublicUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return variantMediaUrl({ scope: 'portfolio', id, variant: variantFile, updatedAtMs });
}

export function reviewVariantPublicUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return variantMediaUrl({ scope: 'review', id, variant: variantFile, updatedAtMs });
}

/** Full-resolution download for delivery finals (`/media/review/{id}/original`). */
export function reviewOriginalPublicUrl(id: string, updatedAtMs: number): string {
  return variantMediaUrl({ scope: 'review', id, variant: 'original', updatedAtMs });
}

/** Admin delivery — ignores collection expiry (JWT-gated `/admin/api/media/review/...`). */
export function reviewVariantAdminUrl(
  id: string,
  variantFile: string,
  updatedAtMs: number,
): string {
  return variantMediaUrl({ scope: 'admin-review', id, variant: variantFile, updatedAtMs });
}
