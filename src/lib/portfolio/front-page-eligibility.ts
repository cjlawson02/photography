import type { PortfolioPhotoRow } from '../dao/portfolio-photos-dao.ts';

/** ADMIN-UX: needs alt + category before joining the front-page set. */
export function canJoinFrontPage(
  photo: Pick<PortfolioPhotoRow, 'status' | 'published' | 'alt' | 'category'>,
): boolean {
  if (photo.status !== 'ready' || !photo.published) {
    return false;
  }
  const alt = photo.alt?.trim();
  const category = photo.category?.trim();
  return Boolean(alt && category);
}
