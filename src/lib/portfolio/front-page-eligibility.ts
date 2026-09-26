import type { PortfolioPhotoRow } from '../dao/portfolio-photos-dao.ts';

type EligibilityFields = Pick<PortfolioPhotoRow, 'status' | 'published' | 'alt'> & {
  tags: readonly string[];
};

/** ADMIN-UX “Needs details”: ingest ready but missing alt text and/or tags. */
export function needsDetails(
  photo: Pick<PortfolioPhotoRow, 'status' | 'alt'> & { tags: readonly string[] },
) {
  return photo.status === 'ready' && (!photo.alt?.trim() || photo.tags.length === 0);
}

/** Plain-language reason a photo cannot join the front-page set; null when it can. */
export function frontPageBlockReason(photo: EligibilityFields): string | null {
  if (photo.status === 'pending') return 'Still processing.';
  if (photo.status === 'failed') return 'Processing failed — retry or remove it first.';
  const missing = [
    photo.alt?.trim() ? null : 'alt text',
    photo.tags.length > 0 ? null : 'a category',
  ].filter(Boolean);
  if (missing.length > 0) return `Needs details: add ${missing.join(' and ')} first.`;
  if (!photo.published) return 'Publish it first.';
  return null;
}

/** ADMIN-UX: needs alt + at least one tag before joining the front-page set. */
export function canJoinFrontPage(photo: EligibilityFields): boolean {
  return frontPageBlockReason(photo) === null;
}
