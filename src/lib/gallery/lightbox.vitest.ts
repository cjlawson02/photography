import { describe, expect, it } from 'vitest';

import { galleryItemFromPhoto } from './lightbox.ts';

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
});
