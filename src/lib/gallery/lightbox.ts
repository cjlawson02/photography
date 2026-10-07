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
};

/** Matches ingest gallery variant width; height is provisional until EXIF is stored. */
export const DEFAULT_GALLERY_WIDTH = GALLERY_VARIANT.width;
export const DEFAULT_GALLERY_HEIGHT = 1200;

let activeLightbox: PhotoSwipe | null = null;

const CAPTION_GAP_PX = 14;
/** Must track `.public-lightbox-caption__title` line box in global.css. */
const CAPTION_TITLE_BLOCK_PX = 30;

/** Approximate rendered caption height so image + title center as one block. */
function captionReserve(item: GalleryLightboxItem): number {
  const parts = galleryLightboxCaptionParts(item);
  if (!parts?.title) return 0;
  return CAPTION_GAP_PX + CAPTION_TITLE_BLOCK_PX;
}

function lightboxPadding(viewport: { x: number; y: number }, item: GalleryLightboxItem) {
  const compact = viewport.x < 640;
  const side = compact ? 10 : Math.round(viewport.x * 0.06);
  const edge = compact ? 48 : Math.round(viewport.y * 0.04);
  const reserve = captionReserve(item);
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

/**
 * Display size for the gallery.webp variant (max width {@link DEFAULT_GALLERY_WIDTH}).
 * D1 stores original EXIF dims; PhotoSwipe must not treat those as the 1600px slide size (FIX-35).
 */
export function galleryDisplayDimensions(photo: {
  width?: number | null;
  height?: number | null;
}): { width: number; height: number } {
  const originalWidth = photo.width;
  const originalHeight = photo.height;
  if (
    originalWidth == null ||
    originalHeight == null ||
    originalWidth <= 0 ||
    originalHeight <= 0
  ) {
    return { width: DEFAULT_GALLERY_WIDTH, height: DEFAULT_GALLERY_HEIGHT };
  }
  if (originalWidth <= DEFAULT_GALLERY_WIDTH) {
    return { width: originalWidth, height: originalHeight };
  }
  const width = DEFAULT_GALLERY_WIDTH;
  const height = Math.round((originalHeight * width) / originalWidth);
  return { width, height };
}

export function galleryItemFromPhoto(photo: {
  galleryUrl: string;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}): GalleryLightboxItem {
  const { width, height } = galleryDisplayDimensions(photo);
  const alt = gallerySlideAlt(photo);
  const title = photo.title?.trim() || undefined;
  return {
    src: photo.galleryUrl,
    width,
    height,
    alt,
    title,
  };
}
