import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { R2DAO } from './r2-dao.ts';

describe('R2DAO.deleteObjects', () => {
  it('calls binding delete with all keys in one batch when under limit', async () => {
    const batches: string[][] = [];
    const bindings = {
      PORTFOLIO: {
        delete: async (keys: string | string[]) => {
          batches.push(Array.isArray(keys) ? keys : [keys]);
        },
      },
      REVIEW: { delete: async () => {} },
    };

    R2DAO.resetInstance();
    const dao = R2DAO.getBindingsInstance(
      bindings as unknown as { PORTFOLIO: R2Bucket; REVIEW: R2Bucket },
    );

    await dao.deleteObjects('portfolio', ['a/1', 'a/2']);
    assert.deepEqual(batches, [['a/1', 'a/2']]);
    R2DAO.resetInstance();
  });
});
