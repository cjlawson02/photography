import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./review-media-access.ts', () => ({
  isReviewMediaAllowedForAdmin: vi.fn(),
  reviewOriginalDownloadFilename: vi.fn(),
}));

import {
  isReviewMediaAllowedForAdmin,
  reviewOriginalDownloadFilename,
} from './review-media-access.ts';
import { buildAdminReviewMediaResponse } from './admin-review-media-response.ts';

const db = {} as D1Database;

describe('buildAdminReviewMediaResponse', () => {
  beforeEach(() => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockReset();
    vi.mocked(reviewOriginalDownloadFilename).mockReset();
  });

  it('returns 404 for invalid media paths', async () => {
    const response = await buildAdminReviewMediaResponse('bad/path/extra', {
      db,
      getReviewObject: async () => null,
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns 404 when the photo is not admin-deliverable', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(false);
    const response = await buildAdminReviewMediaResponse('clphoto123/gallery.webp', {
      db,
      getReviewObject: async () => null,
    });
    expect(response.status).toBe(404);
  });

  it('returns variant bytes with private cache headers', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(true);
    const body = new ReadableStream();
    const response = await buildAdminReviewMediaResponse('clphoto123/gallery.webp', {
      db,
      getReviewObject: async () => ({
        body,
        httpMetadata: { contentType: 'image/webp' },
        httpEtag: '"etag-1"',
      }),
    });

    expect(isReviewMediaAllowedForAdmin).toHaveBeenCalledWith(db, 'clphoto123', {
      allowOriginal: false,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('ETag')).toBe('"etag-1"');
    expect(response.headers.get('Content-Disposition')).toBeNull();
    expect(response.body).toBe(body);
  });

  it('serves originals as attachments when allowed for the photo', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(true);
    vi.mocked(reviewOriginalDownloadFilename).mockResolvedValue('DSC_1234.jpg');
    const getReviewObject = vi.fn(async () => ({
      body: new ReadableStream(),
      httpMetadata: { contentType: 'image/jpeg' },
    }));
    const response = await buildAdminReviewMediaResponse('clphoto123/original', {
      db,
      getReviewObject,
    });

    expect(isReviewMediaAllowedForAdmin).toHaveBeenCalledWith(db, 'clphoto123', {
      allowOriginal: true,
    });
    expect(getReviewObject).toHaveBeenCalledWith('clphoto123/original');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="DSC_1234.jpg"');
  });

  it('returns 404 for originals the access check rejects (e.g. proofs)', async () => {
    vi.mocked(isReviewMediaAllowedForAdmin).mockResolvedValue(false);
    const getReviewObject = vi.fn(async () => null);
    const response = await buildAdminReviewMediaResponse('clproof1/original', {
      db,
      getReviewObject,
    });
    expect(response.status).toBe(404);
    expect(getReviewObject).not.toHaveBeenCalled();
  });
});
