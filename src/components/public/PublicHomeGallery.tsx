import { useCallback, useEffect, useRef, useState } from 'react';

import {
	DEFAULT_GALLERY_HEIGHT,
	DEFAULT_GALLERY_WIDTH,
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
				width: DEFAULT_GALLERY_WIDTH,
				height: DEFAULT_GALLERY_HEIGHT,
			}),
		);
		const index = visiblePhotos.findIndex((p) => p.id === photoId);
		if (index >= 0) openGalleryLightbox(items, index);
	};

	return (
		<section className="mx-auto px-4 py-10" style={{ maxWidth: 1200 }} aria-label="Gallery">
			<p
				className="mb-6 text-center text-sm uppercase tracking-widest"
				style={{ color: 'var(--color-fg-muted)' }}
			>
				Gallery
			</p>

			<div className="mb-6 flex flex-wrap justify-center gap-2" role="list">
				{PORTFOLIO_CATEGORY_LABELS.map((label) => {
					const isActive = label === activeCategory;
					return (
						<button
							key={label}
							type="button"
							role="listitem"
							className="border px-4 py-1.5 text-sm uppercase tracking-wide transition-colors"
							style={{
								borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
								color: isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)',
								background: 'transparent',
							}}
							aria-pressed={isActive}
							onClick={() => setActiveCategory(label)}
						>
							{label}
						</button>
					);
				})}
			</div>

			{photos.length === 0 ? (
				<p className="text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>
					No published photos yet. Upload via{' '}
					<a href="/admin/ingest" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
						admin upload
					</a>
					, then publish on{' '}
					<a
						href="/admin/portfolio"
						style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
					>
						portfolio
					</a>
					.
				</p>
			) : (
				<ul
					ref={gridRef}
					className="m-0 list-none columns-2 gap-3 p-0 sm:columns-3 lg:columns-4"
				>
					{visiblePhotos.map((photo) => (
						<li
							key={photo.id}
							className="mb-3 break-inside-avoid overflow-hidden border"
							style={{
								borderColor: 'var(--color-border)',
								background: 'var(--color-bg-elevated)',
							}}
						>
							<button
								type="button"
								className="block w-full cursor-pointer border-0 p-0"
								style={{ background: 'transparent' }}
								aria-label="View larger image"
								onClick={() => openLightbox(photo.id)}
							>
								<img
									src={photo.galleryUrl}
									alt=""
									width={DEFAULT_GALLERY_WIDTH}
									height={DEFAULT_GALLERY_HEIGHT}
									loading="lazy"
									decoding="async"
									className="block h-auto w-full grayscale transition-[filter] duration-300 hover:grayscale-0"
									onLoad={nudgeMasonry}
								/>
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
