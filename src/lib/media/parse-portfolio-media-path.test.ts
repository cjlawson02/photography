import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePortfolioMediaPath } from './parse-portfolio-media-path.ts';

describe('parsePortfolioMediaPath', () => {
	it('accepts id + allowlisted variant', () => {
		const id = 'clxyz123';
		const result = parsePortfolioMediaPath(`${id}/gallery.webp`);
		assert.equal(result.ok, true);
		if (result.ok) {
			assert.equal(result.id, id);
			assert.equal(result.variantSuffix, 'gallery.webp');
			assert.equal(result.r2Key, `${id}/gallery.webp`);
		}
	});

	it('rejects original and unknown suffixes', () => {
		assert.equal(parsePortfolioMediaPath('id/original').ok, false);
		assert.equal(parsePortfolioMediaPath('id/hero.jpg').ok, false);
	});

	it('rejects extra path segments', () => {
		assert.equal(parsePortfolioMediaPath('a/b/c').ok, false);
	});
});
