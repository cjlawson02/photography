import { describe, expect, it } from 'vitest';

import { reviewDownloadFilename } from './review-download-filename.ts';

describe('reviewDownloadFilename', () => {
  it('uses the stored original filename when present', () => {
    expect(
      reviewDownloadFilename({
        id: 'p1',
        originalFilename: ' DSC_1234.jpg ',
        mimeType: 'image/jpeg',
      }),
    ).toBe('DSC_1234.jpg');
  });

  it.each([
    ['image/jpeg', 'p1.jpg'],
    ['image/png', 'p1.png'],
    ['image/webp', 'p1.webp'],
    ['image/heic', 'p1.heic'],
    ['image/heif', 'p1.heif'],
  ])('falls back to id + extension from %s', (mimeType, expected) => {
    expect(reviewDownloadFilename({ id: 'p1', originalFilename: null, mimeType })).toBe(expected);
    expect(reviewDownloadFilename({ id: 'p1', originalFilename: '  ', mimeType })).toBe(expected);
  });

  it('falls back to the bare id when the MIME type is unknown', () => {
    expect(reviewDownloadFilename({ id: 'p1', originalFilename: null, mimeType: null })).toBe('p1');
    expect(
      reviewDownloadFilename({ id: 'p1', originalFilename: null, mimeType: 'application/x' }),
    ).toBe('p1');
  });
});
