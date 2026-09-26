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

export default function PublicHomeGallery({ photos }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');
  const gridRef = useRef<HTMLUListElement>(null);

  const visiblePhotos =
    activeCategory === 'All'
      ? photos
      : photos.filter((photo) => (photo.category ?? '') === activeCategory);

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
        width: photo.width,
        height: photo.height,
      }),
    );
    const index = visiblePhotos.findIndex((p) => p.id === photoId);
    if (index >= 0) openGalleryLightbox(items, index);
  };

  return (
    <section
      id="gallery"
      className="public-wrap"
      style={{ paddingBlock: 'var(--space-5) var(--space-4)' }}
      aria-label="Gallery"
    >
      <h2 className="public-section-title">Gallery</h2>

      <ul className="public-filters m-0 flex list-none flex-wrap justify-center gap-0 p-0">
        {PORTFOLIO_CATEGORY_LABELS.map((label) => {
          const isActive = label === activeCategory;
          return (
            <li key={label}>
              <button
                type="button"
                className="public-filter-btn"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(label)}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>

      {photos.length === 0 ? (
        <p className="text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          No published photos yet. Upload via{' '}
          <a href="/admin/ingest" className="public-link">
            admin upload
          </a>
          , then publish on{' '}
          <a href="/admin/portfolio" className="public-link">
            portfolio
          </a>
          .
        </p>
      ) : (
        <ul ref={gridRef} className="public-masonry-grid columns-2 sm:columns-3 lg:columns-4">
          {visiblePhotos.map((photo) => {
            const { width, height } = galleryDisplayDimensions(photo);
            return (
              <li key={photo.id} className="public-masonry-item">
                <button
                  type="button"
                  className="block w-full cursor-pointer border-0 p-0"
                  style={{ background: 'transparent' }}
                  aria-label="View larger image"
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
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
