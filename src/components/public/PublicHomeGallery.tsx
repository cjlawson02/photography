import { useCallback, useEffect, useRef, useState } from 'react';

import {
  galleryDisplayDimensions,
  galleryItemFromPhoto,
  openGalleryLightbox,
} from '../../lib/gallery/lightbox.ts';
import { PORTFOLIO_CATEGORY_LABELS } from '../../lib/portfolio/categories.ts';
import type { PublicPortfolioPhoto } from '../../lib/services/portfolio-service.ts';

type Props = {
  photos: PublicPortfolioPhoto[];
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Contact-sheet style code, e.g. `Nature` → `NAT`. */
function categoryCode(category: string | null): string {
  return (category ?? '').slice(0, 3).toUpperCase();
}

export default function PublicHomeGallery({ photos }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');
  const gridRef = useRef<HTMLUListElement>(null);

  const visiblePhotos =
    activeCategory === 'All'
      ? photos
      : photos.filter((photo) => (photo.category ?? '') === activeCategory);

  const countFor = (label: string) =>
    label === 'All' ? photos.length : photos.filter((p) => (p.category ?? '') === label).length;

  const nudgeMasonry = useCallback(() => {
    const grid = gridRef.current;
    if (grid) void grid.offsetHeight;
  }, []);

  useEffect(() => {
    nudgeMasonry();
  }, [activeCategory, nudgeMasonry]);

  const openLightbox = (photoId: string) => {
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
  };

  return (
    <section id="gallery" className="public-gallery" aria-labelledby="gallery-title">
      <div className="public-gallery__head">
        <div>
          <p className="public-kicker" aria-hidden="true">
            Contact sheet — {pad2(visiblePhotos.length)} frames
          </p>
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
                  disabled={count === 0 && !isActive}
                  onClick={() => setActiveCategory(label)}
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
        <ul
          ref={gridRef}
          className="public-masonry-grid public-masonry-grid--sheet columns-2 sm:columns-3 lg:columns-4"
        >
          {visiblePhotos.map((photo, index) => {
            const { width, height } = galleryDisplayDimensions(photo);
            const frame = pad2(index + 1);
            const title = photo.title?.trim();
            return (
              <li key={photo.id} className="public-masonry-item">
                <button
                  type="button"
                  className="public-frame"
                  aria-label={`View frame ${frame}${title ? `, ${title}` : ''} larger`}
                  onClick={() => openLightbox(photo.id)}
                >
                  <img
                    src={photo.galleryUrl}
                    alt={photo.alt?.trim() ?? ''}
                    width={width}
                    height={height}
                    style={{ aspectRatio: `${width} / ${height}` }}
                    loading="lazy"
                    decoding="async"
                    className="public-masonry-img"
                    onLoad={nudgeMasonry}
                  />
                  <span className="public-frame__label" aria-hidden="true">
                    <span className="public-frame__num">▸{frame}</span>
                    {title ? <span className="public-frame__title">{title}</span> : null}
                    <span className="public-frame__code">{categoryCode(photo.category)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
