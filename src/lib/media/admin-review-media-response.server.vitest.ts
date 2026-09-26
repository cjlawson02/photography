import { describe, expect, it, vi } from 'vitest';

vi.mock('./review-media-access.ts', () => ({
  isReviewMediaAllowedForAdmin: vi.fn(),
}));

import { isReviewMediaAllowedForAdmin } from './review-media-access.ts';
import { buildAdminReviewMediaResponse } from './admin-review-media-response.ts';

describe('buildAdminReviewMediaResponse', () => {
  it('returns 404 for invalid media paths', async () => {
    const response = await buildAdminReviewMediaResponse('bad/path/extra', {
      db: {} as D1Database,
      getReviewObject: async () => null,
    });
    expect(response.status).toBe(404);
  });

  it('returns 404 when the photo is not admin-deliverable', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(false);
    const response = await buildAdminReviewMediaResponse('clphoto123/gallery.webp', {
      db: {} as D1Database,
      getReviewObject: async () => null,
    });
    expect(response.status).toBe(404);
  });

  it('returns variant bytes with private cache headers', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(true);
    const body = new ReadableStream();
    const response = await buildAdminReviewMediaResponse('clphoto123/gallery.webp', {
      db: {} as D1Database,
      getReviewObject: async () => ({
        body,
        httpMetadata: { contentType: 'image/webp' },
        httpEtag: '"etag-1"',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('ETag')).toBe('"etag-1"');
    expect(response.body).toBe(body);
  });
});
