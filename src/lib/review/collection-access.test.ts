import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveReviewCollectionAccess } from './collection-access.ts';

describe('resolveReviewCollectionAccess', () => {
	const base = {
		id: 'c1',
		slug: 'test',
		title: null,
		expiresAt: null,
		createdAt: 0,
		updatedAt: 0,
	};

	it('rejects missing collection', () => {
		assert.deepEqual(resolveReviewCollectionAccess(null), { ok: false, reason: 'not_found' });
	});

	it('rejects expired collection', () => {
		const result = resolveReviewCollectionAccess(
			{ ...base, expiresAt: 1_000 },
			2_000,
		);
		assert.deepEqual(result, { ok: false, reason: 'expired' });
	});

	it('accepts active collection', () => {
		const result = resolveReviewCollectionAccess(
			{ ...base, expiresAt: 5_000 },
			2_000,
		);
		assert.equal(result.ok, true);
	});
});
