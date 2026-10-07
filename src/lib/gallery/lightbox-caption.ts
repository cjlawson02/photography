import type { GalleryLightboxItem } from './lightbox.ts';

export type GalleryLightboxCaptionParts = {
  title?: string;
};

/** Alt string used for the slide image (matches `galleryItemFromPhoto`). */
export function gallerySlideAlt(photo: { alt?: string | null; title?: string | null }): string {
  return photo.alt?.trim() || photo.title?.trim() || '';
}

/**
 * Visible caption chrome: title when it adds information beyond slide alt.
 */
export function galleryLightboxCaptionParts(
  item: Pick<GalleryLightboxItem, 'alt' | 'title'>,
): GalleryLightboxCaptionParts | null {
  const alt = item.alt?.trim() ?? '';
  const title = item.title?.trim() ?? '';

  if (title.length === 0 || title === alt) return null;

  return { title };
}

export function renderGalleryLightboxCaption(
  el: HTMLElement,
  parts: GalleryLightboxCaptionParts | null,
): void {
  el.replaceChildren();
  if (!parts) {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    return;
  }

  el.hidden = false;
  el.removeAttribute('aria-hidden');

  if (parts.title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'public-lightbox-caption__title';
    titleEl.textContent = parts.title;
    el.appendChild(titleEl);
  }
}
