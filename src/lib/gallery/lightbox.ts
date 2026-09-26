import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

import {
  galleryLightboxCaptionParts,
  gallerySlideAlt,
  renderGalleryLightboxCaption,
} from './lightbox-caption.ts';
import { GALLERY_VARIANT } from '../ingest/keys.ts';

export type GalleryLightboxItem = {
  src: string;
  width: number;
  height: number;
  alt?: string;
  title?: string;
  caption?: string;
};

/** Matches ingest gallery variant width; height is provisional until EXIF is stored. */
export const DEFAULT_GALLERY_WIDTH = GALLERY_VARIANT.width;
export const DEFAULT_GALLERY_HEIGHT = 1200;

let activeLightbox: PhotoSwipe | null = null;

const CAPTION_GAP_PX = 14;
/** Must track `.public-lightbox-caption__title` / `__body` line boxes in global.css. */
const CAPTION_TITLE_BLOCK_PX = 30;
const CAPTION_BODY_LINE_PX = 24;
const CAPTION_BODY_CHAR_PX = 8.5;

/** Approximate rendered caption height so image + caption center as one block. */
function captionReserve(item: GalleryLightboxItem, textWidth: number): number {
  const parts = galleryLightboxCaptionParts(item);
  if (!parts) return 0;
  let height = CAPTION_GAP_PX;
  if (parts.title) height += CAPTION_TITLE_BLOCK_PX;
  if (parts.body) {
    const charsPerLine = Math.max(20, Math.floor(textWidth / CAPTION_BODY_CHAR_PX));
    height += Math.min(3, Math.ceil(parts.body.length / charsPerLine)) * CAPTION_BODY_LINE_PX;
  }
  return height;
}

function lightboxPadding(viewport: { x: number; y: number }, item: GalleryLightboxItem) {
  const compact = viewport.x < 640;
  const side = compact ? 10 : Math.round(viewport.x * 0.06);
  const edge = compact ? 48 : Math.round(viewport.y * 0.04);
  const reserve = captionReserve(item, viewport.x - side * 2);
  return { left: side, right: side, top: edge, bottom: edge + reserve };
}

export function openGalleryLightbox(items: GalleryLightboxItem[], index: number): void {
  if (items.length === 0 || index < 0 || index >= items.length) return;

  activeLightbox?.close();

  const pswp = new PhotoSwipe({
    dataSource: items,
    index,
    bgOpacity: 0.97,
    loop: true,
    zoom: false,
    arrowPrev: true,
    arrowNext: true,
    close: true,
    paddingFn: (viewport, itemData) => lightboxPadding(viewport, itemData as GalleryLightboxItem),
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

        // Pin the caption to the image's bottom-left edge; hide it while zoomed in.
        const placeCaption = () => {
          const slide = pswp.currSlide;
          if (!slide || el.hidden) return;
          const width = slide.width * slide.currZoomLevel;
          const height = slide.height * slide.currZoomLevel;
          el.style.left = `${Math.round(slide.pan.x)}px`;
          el.style.top = `${Math.round(slide.pan.y + height + CAPTION_GAP_PX)}px`;
          el.style.width = `${Math.round(width)}px`;
          el.dataset.zoomed = String(slide.currZoomLevel > slide.zoomLevels.initial + 0.001);
        };

        const syncCaption = () => {
          const slideItem = pswp.currSlide?.data as GalleryLightboxItem | undefined;
          const parts = slideItem ? galleryLightboxCaptionParts(slideItem) : null;
          renderGalleryLightboxCaption(el, parts);
          placeCaption();
        };

        pswp.on('change', syncCaption);
        pswp.on('zoomPanUpdate', ({ slide }) => {
          if (slide === pswp.currSlide) placeCaption();
        });
        pswp.on('resize', placeCaption);
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
