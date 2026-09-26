import { describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../env.ts';
import { PortfolioService } from './portfolio-service.ts';

function serviceWithUpdate() {
  const update = vi.fn(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
  const app = { d1: { portfolioPhotos: { update } } } as unknown as AppEnv;
  return { service: PortfolioService.from(app), update };
}

describe('PortfolioService.updateMetadata', () => {
  it('clears front-page membership when unpublishing', async () => {
    const { service, update } = serviceWithUpdate();
    await service.updateMetadata('p1', { published: false });
    expect(update).toHaveBeenCalledWith('p1', {
      published: false,
      frontPage: false,
      frontPageOrder: null,
    });
  });

  it('leaves front-page membership alone for other edits', async () => {
    const { service, update } = serviceWithUpdate();
    await service.updateMetadata('p1', { published: true, alt: 'Dunes' });
    expect(update).toHaveBeenCalledWith('p1', { published: true, alt: 'Dunes' });
  });
});
