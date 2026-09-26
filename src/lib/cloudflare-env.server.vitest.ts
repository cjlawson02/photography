import { describe, expect, it } from 'vitest';

import { R2ConfigError } from './dao/r2-dao.ts';
import { accessEnvFrom, getCloudflareBindings, getCloudflareEnv } from './cloudflare-env.ts';

const bindings = {
  DB: { prepare() {} },
  PORTFOLIO: { get() {} },
  REVIEW: { get() {} },
  IMAGES: { input() {} },
};

describe('getCloudflareBindings', () => {
  it('accepts Worker bindings without R2 secrets', () => {
    const parsed = getCloudflareBindings(bindings);
    expect(parsed.DB).toBe(bindings.DB);
    expect(parsed.PORTFOLIO).toBe(bindings.PORTFOLIO);
  });

  it('rejects missing bindings', () => {
    expect(() => getCloudflareBindings({ DB: bindings.DB })).toThrow();
  });
});

describe('getCloudflareEnv', () => {
  it('requires non-empty R2 S3 secrets', () => {
    expect(() =>
      getCloudflareEnv({ ...bindings, R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: 'a' }),
    ).toThrow(R2ConfigError);
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
    expect(parsed.R2_ACCOUNT_ID).toBe('acct');
    expect(parsed.R2_ACCESS_KEY_ID).toBe('key');
    expect(parsed.R2_SECRET_ACCESS_KEY).toBe('secret');
  });
});

describe('accessEnvFrom', () => {
  it('treats empty Access placeholders as unset', () => {
    const access = accessEnvFrom({ CF_ACCESS_TEAM_DOMAIN: '', CF_ACCESS_AUD: '  ' });
    expect(access.CF_ACCESS_TEAM_DOMAIN).toBe('');
    expect(access.CF_ACCESS_AUD).toBe('');
  });

  it('keeps configured Access strings', () => {
    const access = accessEnvFrom({
      CF_ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
      CF_ACCESS_AUD: 'aud-value',
    });
    expect(access.CF_ACCESS_TEAM_DOMAIN).toBe('https://team.cloudflareaccess.com');
    expect(access.CF_ACCESS_AUD).toBe('aud-value');
  });
});
