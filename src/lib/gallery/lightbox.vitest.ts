import { describe, expect, it } from 'vitest';

import { galleryDisplayDimensions, galleryItemFromPhoto } from './lightbox.ts';

describe('galleryDisplayDimensions', () => {
  it('caps original EXIF size to the gallery variant width (FIX-35)', () => {
    expect(galleryDisplayDimensions({ width: 6000, height: 4000 })).toEqual({
      width: 1600,
      height: 1067,
    });
  });

  it('keeps dims when already within the gallery variant width', () => {
    expect(galleryDisplayDimensions({ width: 800, height: 600 })).toEqual({
      width: 800,
      height: 600,
    });
  });
});

describe('galleryItemFromPhoto', () => {
  it('maps metadata for lightbox slides', () => {
    const item = galleryItemFromPhoto({
      galleryUrl: '/media/portfolio/x/gallery.webp',
      alt: ' Alt ',
      title: ' Title ',
      caption: ' Caption ',
      width: 800,
      height: 600,
    });

    expect(item).toMatchObject({
      src: '/media/portfolio/x/gallery.webp',
      width: 800,
      height: 600,
      alt: 'Alt',
      title: 'Title',
      caption: 'Caption',
    });
  });

  it('uses capped dims for large originals', () => {
    const item = galleryItemFromPhoto({
      galleryUrl: '/media/review/x/gallery.webp',
      width: 6000,
      height: 4000,
    });
    expect(item.width).toBe(1600);
    expect(item.height).toBe(1067);
  });
});
