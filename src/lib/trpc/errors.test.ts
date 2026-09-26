import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../http/app-error.ts';
import { appErrorToTrpc, trpcErrorToHttpStatus } from './errors.ts';

test('appErrorToTrpc maps codes', () => {
	const err = appErrorToTrpc(new AppError('NOT_FOUND', 'missing'));
	assert.equal(err.code, 'NOT_FOUND');
	assert.equal(err.message, 'missing');
});

test('trpcErrorToHttpStatus mirrors AppError status table', () => {
	assert.equal(trpcErrorToHttpStatus('FORBIDDEN'), 403);
	assert.equal(trpcErrorToHttpStatus('BAD_REQUEST'), 400);
});
