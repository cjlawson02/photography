import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

import {
  galleryLightboxCaptionParts,
  gallerySlideAlt,
  renderGalleryLightboxCaption,
} from './lightbox-caption.ts';

export type GalleryLightboxItem = {
  src: string;
  width: number;
  height: number;
  alt?: string;
  title?: string;
  caption?: string;
};

/** Matches ingest `gallery.webp` width; height is provisional until EXIF is stored. */
export const DEFAULT_GALLERY_WIDTH = 1600;
export const DEFAULT_GALLERY_HEIGHT = 1200;

let activeLightbox: PhotoSwipe | null = null;

export function openGalleryLightbox(items: GalleryLightboxItem[], index: number): void {
  if (items.length === 0 || index < 0 || index >= items.length) return;

  activeLightbox?.close();

  const pswp = new PhotoSwipe({
    dataSource: items,
    index,
    bgOpacity: 0.92,
    loop: true,
    zoom: true,
    arrowPrev: true,
    arrowNext: true,
    close: true,
  });

  pswp.on('uiRegister', () => {
    if (!pswp.ui) return;
    pswp.ui.registerElement({
      name: 'gallery-caption',
      className: 'public-lightbox-caption',
      order: 8,
      isButton: false,
      tagName: 'figcaption',
      appendTo: 'root',
      onInit: (el) => {
        el.setAttribute('aria-live', 'polite');
        const syncCaption = () => {
          const slideItem = pswp.currSlide?.data as GalleryLightboxItem | undefined;
          const parts = slideItem ? galleryLightboxCaptionParts(slideItem) : null;
          renderGalleryLightboxCaption(el, parts);
        };
        pswp.on('change', syncCaption);
        syncCaption();
      },
    });
  });

  activeLightbox = pswp;
  pswp.on('destroy', () => {
    if (activeLightbox === pswp) activeLightbox = null;
  });
  pswp.init();
}

export function galleryDisplayDimensions(photo: {
  width?: number | null;
  height?: number | null;
}): { width: number; height: number } {
  return {
    width: photo.width ?? DEFAULT_GALLERY_WIDTH,
    height: photo.height ?? DEFAULT_GALLERY_HEIGHT,
  };
}

export function galleryItemFromPhoto(photo: {
  galleryUrl: string;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
}): GalleryLightboxItem {
  const { width, height } = galleryDisplayDimensions(photo);
  const alt = gallerySlideAlt(photo);
  const title = photo.title?.trim() || undefined;
  const caption = photo.caption?.trim() || undefined;
  return {
    src: photo.galleryUrl,
    width,
    height,
    alt,
    title,
    caption,
  };
}
