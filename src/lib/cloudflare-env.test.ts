import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { R2ConfigError } from './dao/r2-dao.ts';
import {
	accessEnvFrom,
	getCloudflareBindings,
	getCloudflareEnv,
} from './cloudflare-env.ts';

const bindings = {
	DB: { prepare() {} },
	PORTFOLIO: { get() {} },
	REVIEW: { get() {} },
	IMAGES: { input() {} },
};

describe('getCloudflareBindings', () => {
	it('accepts Worker bindings without R2 secrets', () => {
		const parsed = getCloudflareBindings(bindings);
		assert.equal(parsed.DB, bindings.DB);
		assert.equal(parsed.PORTFOLIO, bindings.PORTFOLIO);
	});

	it('rejects missing bindings', () => {
		assert.throws(() => getCloudflareBindings({ DB: bindings.DB }));
	});
});

describe('getCloudflareEnv', () => {
	it('requires non-empty R2 S3 secrets', () => {
		assert.throws(
			() => getCloudflareEnv({ ...bindings, R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: 'a' }),
			(error: unknown) => error instanceof R2ConfigError,
		);
	});

	it('returns bindings + secrets when R2_* are set', () => {
		const parsed = getCloudflareEnv({
			...bindings,
			R2_ACCOUNT_ID: 'acct',
			R2_ACCESS_KEY_ID: 'key',
			R2_SECRET_ACCESS_KEY: 'secret',
			CF_ACCESS_TEAM_DOMAIN: '',
			CF_ACCESS_AUD: '',
		});
		assert.equal(parsed.R2_ACCOUNT_ID, 'acct');
		assert.equal(parsed.R2_ACCESS_KEY_ID, 'key');
		assert.equal(parsed.R2_SECRET_ACCESS_KEY, 'secret');
	});
});

describe('accessEnvFrom', () => {
	it('treats empty Access placeholders as unset', () => {
		const access = accessEnvFrom({ CF_ACCESS_TEAM_DOMAIN: '', CF_ACCESS_AUD: '  ' });
		assert.equal(access.CF_ACCESS_TEAM_DOMAIN, '');
		assert.equal(access.CF_ACCESS_AUD, '');
	});

	it('keeps configured Access strings', () => {
		const access = accessEnvFrom({
			CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
			CF_ACCESS_AUD: 'aud-value',
		});
		assert.equal(access.CF_ACCESS_TEAM_DOMAIN, 'https://team.cloudflareaccess.com');
		assert.equal(access.CF_ACCESS_AUD, 'aud-value');
	});
});
