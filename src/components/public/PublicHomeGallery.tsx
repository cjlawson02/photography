import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import {
  galleryDisplayDimensions,
  galleryItemFromPhoto,
  openGalleryLightbox,
} from '../../lib/gallery/lightbox.ts';
import { computeMosaicLayout, type MosaicOptions } from '../../lib/gallery/mosaic-layout.ts';
import { PORTFOLIO_CATEGORY_LABELS } from '../../lib/portfolio/categories.ts';
import type { PublicPortfolioPhoto } from '../../lib/services/portfolio-service.ts';

type Props = {
  photos: PublicPortfolioPhoto[];
};

type SheetPhase = 'idle' | 'exiting' | 'entering';

/** SSR / pre-measure width; positions are percentages so the sheet scales until measured. */
const DEFAULT_SHEET_WIDTH = 1440;

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function photosForCategory(
  photos: PublicPortfolioPhoto[],
  category: string,
): PublicPortfolioPhoto[] {
  return category === 'All'
    ? photos
    : photos.filter((photo) => (photo.category ?? '') === category);
}

function mosaicOptions(containerWidth: number): MosaicOptions {
  if (containerWidth < 640) {
    return { containerWidth, gap: 4, targetRowHeight: 200, maxSlots: 2, minItemHeight: 110 };
  }
  if (containerWidth < 1024) {
    return { containerWidth, gap: 6, targetRowHeight: 240, maxSlots: 3, minItemHeight: 140 };
  }
  return {
    containerWidth,
    gap: 8,
    targetRowHeight: Math.min(380, Math.max(260, containerWidth / 5.5)),
    maxSlots: 3,
    minItemHeight: 180,
  };
}

export default function PublicHomeGallery({ photos }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');
  /** Frames currently painted — lags `activeCategory` during the exit beat. */
  const [sheetCategory, setSheetCategory] = useState('All');
  const [phase, setPhase] = useState<SheetPhase>('idle');
  const [sheetWidth, setSheetWidth] = useState(DEFAULT_SHEET_WIDTH);
  const sheetRef = useRef<HTMLDivElement>(null);
  const filterLockRef = useRef(false);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setSheetWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visiblePhotos = useMemo(
    () => photosForCategory(photos, sheetCategory),
    [photos, sheetCategory],
  );

  const layout = useMemo(() => {
    const ratios = visiblePhotos.map((photo) => {
      const { width, height } = galleryDisplayDimensions(photo);
      return width / height;
    });
    return computeMosaicLayout(ratios, mosaicOptions(sheetWidth));
  }, [visiblePhotos, sheetWidth]);

  const countFor = (label: string) =>
    label === 'All' ? photos.length : photos.filter((p) => (p.category ?? '') === label).length;

  const setCategory = useCallback(
    async (label: string) => {
      if (label === activeCategory || filterLockRef.current) return;

      if (prefersReducedMotion()) {
        setActiveCategory(label);
        setSheetCategory(label);
        return;
      }

      const nextCount = photosForCategory(photos, label).length;
      filterLockRef.current = true;
      try {
        setActiveCategory(label);
        setPhase('exiting');
        await wait(260);
        setSheetCategory(label);
        setPhase('entering');
        await wait(Math.min(1100, 480 + nextCount * 28));
        setPhase('idle');
      } finally {
        filterLockRef.current = false;
      }
    },
    [activeCategory, photos],
  );

  const openLightbox = useCallback(
    (photoId: string) => {
      const items = visiblePhotos.map((photo) =>
        galleryItemFromPhoto({
          galleryUrl: photo.galleryUrl,
          alt: photo.alt,
          title: photo.title,
          caption: photo.caption,
          width: photo.width,
          height: photo.height,
        }),
      );
      const index = visiblePhotos.findIndex((p) => p.id === photoId);
      if (index >= 0) openGalleryLightbox(items, index);
    },
    [visiblePhotos],
  );

  const sheetClass = [
    'public-sheet',
    phase === 'exiting' ? 'is-exiting' : '',
    phase === 'entering' ? 'is-entering' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section id="gallery" className="public-gallery" aria-labelledby="gallery-title">
      <div className="public-gallery__head">
        <div>
          <h2 id="gallery-title" className="public-section-title">
            Gallery
          </h2>
        </div>

        <ul className="public-filters" aria-label="Filter by category">
          {PORTFOLIO_CATEGORY_LABELS.map((label) => {
            const isActive = label === activeCategory;
            const count = countFor(label);
            return (
              <li key={label}>
                <button
                  type="button"
                  className="public-filter-btn"
                  aria-pressed={isActive}
                  aria-label={`${label}, ${count} photos`}
                  disabled={(count === 0 && !isActive) || phase !== 'idle'}
                  onClick={() => {
                    void setCategory(label);
                  }}
                >
                  <span>{label}</span>
                  <span className="public-filter-btn__count">[{pad2(count)}]</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {photos.length === 0 ? (
        <p className="public-empty">
          No published photos yet. Upload and publish from{' '}
          <a href="/admin/portfolio" className="public-link">
            portfolio admin
          </a>
          .
        </p>
      ) : (
        <div
          ref={sheetRef}
          className={sheetClass}
          style={{ aspectRatio: `${layout.width} / ${Math.max(1, layout.height)}` }}
        >
          {layout.items.map((item) => {
            const photo = visiblePhotos[item.index];
            const { width, height } = galleryDisplayDimensions(photo);
            const title = photo.title?.trim();
            const category = photo.category?.trim();
            const style = {
              '--i': item.index,
              left: pct(item.left, layout.width),
              top: pct(item.top, layout.height),
              width: pct(item.width, layout.width),
              height: pct(item.height, layout.height),
            } as CSSProperties;
            return (
              <button
                key={photo.id}
                type="button"
                className="public-frame public-sheet__item"
                style={style}
                aria-label={title ? `View ${title} larger` : 'View larger image'}
                onClick={() => openLightbox(photo.id)}
              >
                <img
                  src={photo.galleryUrl}
                  alt={photo.alt?.trim() ?? ''}
                  width={width}
                  height={height}
                  loading="lazy"
                  decoding="async"
                  className="public-masonry-img"
                />
                {title || category ? (
                  <span className="public-frame__label" aria-hidden="true">
                    {title ? <span className="public-frame__title">{title}</span> : null}
                    {category ? <span className="public-frame__category">{category}</span> : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
