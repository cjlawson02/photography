import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PublicPortfolioPhoto } from '../services/portfolio-service.ts';
import { selectHeroPhotos } from './hero-photos.ts';

describe('selectHeroPhotos', () => {
	const base = (overrides: Partial<PublicPortfolioPhoto>): PublicPortfolioPhoto => ({
		id: 'a',
		category: null,
		sortOrder: null,
		hero: false,
		galleryUrl: '/media/portfolio/a/gallery.webp',
		...overrides,
	});

	it('returns only published-ready rows flagged hero', () => {
		const photos = [
			base({ id: '1', hero: true }),
			base({ id: '2', hero: false }),
			base({ id: '3', hero: true }),
		];
		const heroes = selectHeroPhotos(photos);
		assert.deepEqual(heroes.map((p) => p.id), ['1', '3']);
	});

	it('preserves list order (sortOrder from DAO)', () => {
		const photos = [
			base({ id: 'late', hero: true, sortOrder: 20 }),
			base({ id: 'early', hero: true, sortOrder: 1 }),
		];
		const heroes = selectHeroPhotos(photos);
		assert.deepEqual(heroes.map((p) => p.id), ['late', 'early']);
	});
});
