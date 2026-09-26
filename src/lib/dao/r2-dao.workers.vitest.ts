import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { R2DAO } from './r2-dao.ts';

describe('R2DAO.deleteObjects (workerd)', () => {
  beforeEach(() => {
    R2DAO.resetInstance();
  });

  it('deletes objects via the real portfolio R2 binding', async () => {
    await env.PORTFOLIO.put('test/a/1', 'one');
    await env.PORTFOLIO.put('test/a/2', 'two');

    const dao = R2DAO.getBindingsInstance({
      PORTFOLIO: env.PORTFOLIO,
      REVIEW: env.REVIEW,
    });
    await dao.deleteObjects('portfolio', ['test/a/1', 'test/a/2']);

    expect(await env.PORTFOLIO.get('test/a/1')).toBeNull();
    expect(await env.PORTFOLIO.get('test/a/2')).toBeNull();
  });
});
