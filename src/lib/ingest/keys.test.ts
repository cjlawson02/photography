import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createId } from '@paralleldrive/cuid2';

import {
	isAllowlistedVariantSuffix,
	originalKey,
	VARIANT_SPECS,
	variantKey,
} from './keys.ts';
import { isPurposeBucket, presignBodySchema } from './schemas.ts';

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
});

describe('presign body schema', () => {
	it('requires collectionId for review', () => {
		const missing = presignBodySchema.safeParse({
			bucket: 'review',
			contentType: 'image/jpeg',
		});
		assert.equal(missing.success, false);

		const collectionId = createId();
		const ok = presignBodySchema.safeParse({
			bucket: 'review',
			contentType: 'image/jpeg',
			collectionId,
		});
		assert.equal(ok.success, true);
		if (ok.success) {
			assert.equal(ok.data.bucket, 'review');
			assert.equal(ok.data.collectionId, collectionId);
		}
	});

	it('accepts portfolio without collectionId', () => {
		const ok = presignBodySchema.safeParse({
			bucket: 'portfolio',
			contentType: 'image/jpeg',
		});
		assert.equal(ok.success, true);
		if (ok.success) assert.equal(ok.data.bucket, 'portfolio');
	});
});
