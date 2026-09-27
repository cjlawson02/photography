import { describe, expect, it } from 'vitest';

import { titleFromUploadFilename } from './title-from-filename.ts';

describe('titleFromUploadFilename', () => {
  it('strips a trailing extension and path', () => {
    expect(titleFromUploadFilename('IMG_0973.jpg')).toBe('IMG_0973');
    expect(titleFromUploadFilename('folder/my.photo.name.webp')).toBe('my.photo.name');
    expect(titleFromUploadFilename('shots\\DSC_1.HEIC')).toBe('DSC_1');
  });

  it('returns null for empty input', () => {
    expect(titleFromUploadFilename(null)).toBeNull();
    expect(titleFromUploadFilename(undefined)).toBeNull();
    expect(titleFromUploadFilename('   ')).toBeNull();
  });

  it('keeps names without an extension', () => {
    expect(titleFromUploadFilename('untitled')).toBe('untitled');
  });
});
