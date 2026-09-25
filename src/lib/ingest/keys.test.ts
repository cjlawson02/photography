import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isAllowlistedVariantSuffix,
	originalKey,
	VARIANT_SPECS,
	variantKey,
} from './keys.ts';
import { isPurposeBucket, R2_BUCKET_NAMES } from './buckets.ts';

describe('ingest keys', () => {
	it('derives all object keys from photo id only', () => {
		const id = 'photo-uuid';
		assert.equal(originalKey(id), `${id}/original`);
		assert.equal(variantKey(id, 'gallery.webp'), `${id}/gallery.webp`);
		assert.equal(variantKey(id, 'thumb.webp'), `${id}/thumb.webp`);
	});

	it('allowlists provisional variant suffixes only', () => {
		for (const spec of VARIANT_SPECS) {
			assert.equal(isAllowlistedVariantSuffix(spec.suffix), true);
		}
		assert.equal(isAllowlistedVariantSuffix('original'), false);
		assert.equal(isAllowlistedVariantSuffix('../etc/passwd'), false);
	});
});

describe('purpose buckets', () => {
	it('accepts portfolio and review only', () => {
		assert.equal(isPurposeBucket('portfolio'), true);
		assert.equal(isPurposeBucket('review'), true);
		assert.equal(isPurposeBucket('other'), false);
	});

	it('maps to wrangler bucket names', () => {
		assert.equal(R2_BUCKET_NAMES.portfolio, 'photography-portfolio');
		assert.equal(R2_BUCKET_NAMES.review, 'photography-review');
	});
});
