import type { PublicPortfolioPhoto } from '../services/portfolio-service.ts';

/** Hero carousel — subset already ordered by portfolio DAO sort rules. */
export function selectHeroPhotos(photos: PublicPortfolioPhoto[]): PublicPortfolioPhoto[] {
	return photos.filter((photo) => photo.hero);
}
