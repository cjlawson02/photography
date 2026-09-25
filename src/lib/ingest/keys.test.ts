import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isAllowlistedVariantSuffix,
	ORIGINAL_SUFFIX,
	originalKey,
	VARIANT_SPECS,
	variantKey,
} from './keys.ts';
import { isPurposeBucket, R2_BUCKET_NAMES } from './buckets.ts';

describe('ingest keys', () => {
	it('builds original and variant keys under id prefix', () => {
		assert.equal(originalKey('abc'), `abc/${ORIGINAL_SUFFIX}`);
		assert.equal(variantKey('abc', 'gallery.webp'), 'abc/gallery.webp');
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
