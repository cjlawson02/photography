import { describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../env.ts';
import { AppError } from '../http/app-error.ts';
import { PortfolioService } from './portfolio-service.ts';

type Row = {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  published: boolean;
  alt: string | null;
  tags: string[];
};

function row(id: string, overrides: Partial<Row> = {}): Row {
  return { id, status: 'ready', published: true, alt: 'Alt', tags: ['Nature'], ...overrides };
}

function serviceWithDao(options: { frontPage?: Row[]; others?: Row[] } = {}) {
  const frontPage = options.frontPage ?? [];
  const all = [...frontPage, ...(options.others ?? [])];
  const dao = {
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch })),
    updateMany: vi.fn(async (ids: string[], patch: Record<string, unknown>) =>
      ids.map((id) => ({ id, ...patch })),
    ),
    listFrontPageForAdmin: vi.fn(async () => frontPage),
    getByIds: vi.fn(async (ids: string[]) => all.filter((r) => ids.includes(r.id))),
    applyFrontPageSet: vi.fn(async () => undefined),
  };
  const app = { d1: { portfolioPhotos: dao } } as unknown as AppEnv;
  return { service: PortfolioService.from(app), dao };
}

describe('PortfolioService.updateMetadata', () => {
  it('clears front-page membership when unpublishing', async () => {
    const { service, dao } = serviceWithDao();
    await service.updateMetadata('p1', { published: false });
    expect(dao.update).toHaveBeenCalledWith('p1', {
      published: false,
      frontPage: false,
      frontPageOrder: null,
    });
  });

  it('leaves front-page membership alone for other edits', async () => {
    const { service, dao } = serviceWithDao();
    await service.updateMetadata('p1', { published: true, alt: 'Dunes' });
    expect(dao.update).toHaveBeenCalledWith('p1', { published: true, alt: 'Dunes' });
  });
});

describe('PortfolioService.bulkUpdateMetadata', () => {
  it('issues one statement for the whole selection and clears front page on unpublish', async () => {
    const { service, dao } = serviceWithDao();
    await service.bulkUpdateMetadata(['a', 'b', 'a'], { published: false });
    expect(dao.updateMany).toHaveBeenCalledTimes(1);
    expect(dao.updateMany).toHaveBeenCalledWith(['a', 'b'], {
      published: false,
      frontPage: false,
      frontPageOrder: null,
    });
    expect(dao.update).not.toHaveBeenCalled();
  });
});

describe('PortfolioService.reorderFrontPage', () => {
  const frontPage = [row('a'), row('b'), row('c')];

  it('writes the new order in a single atomic batch', async () => {
    const { service, dao } = serviceWithDao({ frontPage });
    await service.reorderFrontPage(['c', 'a', 'b']);
    expect(dao.applyFrontPageSet).toHaveBeenCalledTimes(1);
    expect(dao.applyFrontPageSet).toHaveBeenCalledWith({ orderedIds: ['c', 'a', 'b'] });
    expect(dao.update).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing photo', ['a', 'b']],
    ['an unknown photo', ['a', 'b', 'x']],
    ['a duplicate', ['a', 'a', 'b']],
    ['an extra photo', ['a', 'b', 'c', 'x']],
  ])('rejects %s without writing', async (_label, orderedIds) => {
    const { service, dao } = serviceWithDao({ frontPage });
    await expect(service.reorderFrontPage(orderedIds)).rejects.toBeInstanceOf(AppError);
    expect(dao.applyFrontPageSet).not.toHaveBeenCalled();
  });
});

describe('PortfolioService.setFrontPage', () => {
  it('restores removed photos with hero in one batch', async () => {
    const { service, dao } = serviceWithDao({
      frontPage: [row('a'), row('c')],
      others: [row('b')],
    });
    await service.setFrontPage(['a', 'b', 'c'], ['b']);
    expect(dao.applyFrontPageSet).toHaveBeenCalledWith({
      orderedIds: ['a', 'b', 'c'],
      removeIds: [],
      heroIds: ['b'],
    });
  });

  it('rejects newcomers that need details', async () => {
    const { service, dao } = serviceWithDao({ others: [row('b', { alt: null })] });
    await expect(service.setFrontPage(['b'])).rejects.toThrow(/Needs details/);
    expect(dao.applyFrontPageSet).not.toHaveBeenCalled();
  });
});

describe('PortfolioService.addToFrontPage', () => {
  it('appends eligible photos and reports skipped ones', async () => {
    const { service, dao } = serviceWithDao({
      frontPage: [row('a')],
      others: [row('b'), row('c', { tags: [] }), row('d', { published: false })],
    });
    const result = await service.addToFrontPage(['b', 'c', 'd', 'a']);
    expect(result.added).toEqual(['b']);
    expect(result.skipped.map((s) => s.id)).toEqual(['c', 'd']);
    expect(dao.applyFrontPageSet).toHaveBeenCalledWith({ orderedIds: ['a', 'b'] });
  });
});
