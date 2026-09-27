import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./portfolio-media-access.ts', () => ({
  isPortfolioMediaAllowedForAdmin: vi.fn(),
}));

import { isPortfolioMediaAllowedForAdmin } from './portfolio-media-access.ts';
import { buildAdminPortfolioMediaResponse } from './admin-portfolio-media-response.ts';

const db = {} as D1Database;

describe('buildAdminPortfolioMediaResponse', () => {
  beforeEach(() => {
    vi.mocked(isPortfolioMediaAllowedForAdmin).mockReset();
  });

  it('returns 404 for invalid media paths', async () => {
    const response = await buildAdminPortfolioMediaResponse('bad/path/extra', {
      db,
      getPortfolioObject: async () => null,
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns 404 when the photo is not admin-deliverable', async () => {
    vi.mocked(isPortfolioMediaAllowedForAdmin).mockResolvedValue(false);
    const response = await buildAdminPortfolioMediaResponse('clphoto123/thumb.webp', {
      db,
      getPortfolioObject: async () => null,
    });
    expect(response.status).toBe(404);
  });

  it('returns variant bytes with private cache headers', async () => {
    vi.mocked(isPortfolioMediaAllowedForAdmin).mockResolvedValue(true);
    const body = new ReadableStream();
    const response = await buildAdminPortfolioMediaResponse('clphoto123/thumb.webp', {
      db,
      getPortfolioObject: async () => ({
        body,
        httpMetadata: { contentType: 'image/webp' },
        httpEtag: '"etag-1"',
      }),
    });

    expect(isPortfolioMediaAllowedForAdmin).toHaveBeenCalledWith(db, 'clphoto123');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('ETag')).toBe('"etag-1"');
  });
});
