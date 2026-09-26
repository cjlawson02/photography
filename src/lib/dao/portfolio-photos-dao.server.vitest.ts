import { describe, expect, it, vi } from 'vitest';

import { createDb } from '../../db/client.ts';
import { PortfolioPhotosDAO } from './portfolio-photos-dao.ts';

type FakeStatement = { sql: string; params: unknown[] };

const makeStatement = (
  sql: string,
  params: unknown[] = [],
): FakeStatement & Record<string, unknown> => {
  const stmt = {
    sql,
    params,
    bind: (...next: unknown[]) => makeStatement(sql, next),
    run: vi.fn(async () => ({ results: [], success: true, meta: {} })),
    all: vi.fn(async () => ({ results: [], success: true, meta: {} })),
    raw: vi.fn(async () => []),
    first: vi.fn(async () => null),
  };
  return stmt;
};

function fakeD1() {
  const batch = vi.fn(async (statements: FakeStatement[]) =>
    statements.map(() => ({ results: [], success: true, meta: {} })),
  );
  const d1 = { prepare: (sql: string) => makeStatement(sql), batch };
  return { d1: d1 as unknown as D1Database, batch };
}

describe('PortfolioPhotosDAO.applyFrontPageSet', () => {
  it('sends removals and every order write in one D1 batch', async () => {
    const { d1, batch } = fakeD1();
    await new PortfolioPhotosDAO(createDb(d1)).applyFrontPageSet({
      orderedIds: ['a', 'b'],
      removeIds: ['x'],
      heroIds: ['b'],
    });
    expect(batch).toHaveBeenCalledTimes(1);
    const statements = batch.mock.calls[0]![0];
    expect(statements).toHaveLength(3);
    expect(statements.every((s) => s.sql.startsWith('update "PortfolioPhotos"'))).toBe(true);
    expect(statements[2]!.sql).toContain('"hero"');
    expect(statements[1]!.sql).not.toContain('"hero"');
  });

  it('skips the batch when there is nothing to write', async () => {
    const { d1, batch } = fakeD1();
    await new PortfolioPhotosDAO(createDb(d1)).applyFrontPageSet({ orderedIds: [] });
    expect(batch).not.toHaveBeenCalled();
  });
});
