import { describe, expect, it } from 'vitest';

import {
  galleryLightboxCaptionParts,
  gallerySlideAlt,
  renderGalleryLightboxCaption,
} from './lightbox-caption.ts';

describe('gallerySlideAlt', () => {
  it('prefers alt over title', () => {
    expect(gallerySlideAlt({ alt: ' Alt ', title: 'Title' })).toBe('Alt');
  });

  it('falls back to title when alt is empty', () => {
    expect(gallerySlideAlt({ alt: '', title: 'Title' })).toBe('Title');
  });
});

describe('galleryLightboxCaptionParts', () => {
  it('returns null when there is nothing to show', () => {
    expect(galleryLightboxCaptionParts({ alt: 'Same', title: 'Same', caption: '' })).toBeNull();
    expect(galleryLightboxCaptionParts({ alt: 'Only alt', title: '', caption: '' })).toBeNull();
  });

  it('shows caption only', () => {
    expect(
      galleryLightboxCaptionParts({ alt: 'Alt', title: 'Alt', caption: 'A longer caption.' }),
    ).toEqual({ body: 'A longer caption.' });
  });

  it('shows title when distinct from alt', () => {
    expect(
      galleryLightboxCaptionParts({ alt: 'Short alt', title: 'Formal title', caption: '' }),
    ).toEqual({ title: 'Formal title' });
  });

  it('shows title and caption together', () => {
    expect(
      galleryLightboxCaptionParts({
        alt: 'Alt',
        title: 'Title',
        caption: 'Caption body',
      }),
    ).toEqual({ title: 'Title', body: 'Caption body' });
  });
});

describe('renderGalleryLightboxCaption', () => {
  it('hides the element when parts are null', () => {
    const el = document.createElement('figcaption');
    renderGalleryLightboxCaption(el, null);
    expect(el.hidden).toBe(true);
    expect(el.childElementCount).toBe(0);
  });

  it('renders title and body with expected classes', () => {
    const el = document.createElement('figcaption');
    renderGalleryLightboxCaption(el, { title: 'T', body: 'B' });
    expect(el.hidden).toBe(false);
    expect(el.querySelector('.public-lightbox-caption__title')?.textContent).toBe('T');
    expect(el.querySelector('.public-lightbox-caption__body')?.textContent).toBe('B');
  });
});
