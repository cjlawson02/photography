import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { R2ConfigError } from '../dao/r2-dao.ts';
import { APP_ERROR_STATUS, AppError } from './app-error.ts';

describe('AppError', () => {
	it('maps codes to HTTP status', () => {
		assert.equal(new AppError('BAD_REQUEST', 'nope').status, 400);
		assert.equal(new AppError('NOT_FOUND', 'missing').status, 404);
		assert.equal(new AppError('PRECONDITION_FAILED', 'put').status, 412);
		assert.equal(new AppError('INTERNAL_SERVER_ERROR', 'boom').status, 500);
		assert.equal(new AppError('SERVICE_UNAVAILABLE', 'r2').status, 503);
		assert.equal(APP_ERROR_STATUS.FORBIDDEN, 403);
	});

	it('toResponse is JSON { ok: false, error }', async () => {
		const response = new AppError('NOT_FOUND', 'Photo not found').toResponse();
		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { ok: false, error: 'Photo not found' });
	});

	it('fromUnknown maps R2ConfigError to 503', () => {
		const mapped = AppError.fromUnknown(new R2ConfigError('R2 S3 secrets not configured'));
		assert.equal(mapped.code, 'SERVICE_UNAVAILABLE');
		assert.equal(mapped.status, 503);
	});
});
