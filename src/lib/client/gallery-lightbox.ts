import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

export type GalleryLightboxItem = {
	src: string;
	width: number;
	height: number;
	alt?: string;
};

/** Matches ingest `gallery.webp` width; height is provisional until EXIF is stored. */
const DEFAULT_GALLERY_WIDTH = 1600;
const DEFAULT_GALLERY_HEIGHT = 1200;

let activeLightbox: PhotoSwipe | null = null;

function itemFromElement(el: HTMLElement): GalleryLightboxItem | null {
	const src = el.dataset.galleryUrl?.trim();
	if (!src) return null;
	const width = Number(el.dataset.galleryWidth) || DEFAULT_GALLERY_WIDTH;
	const height = Number(el.dataset.galleryHeight) || DEFAULT_GALLERY_HEIGHT;
	const alt = el.dataset.galleryTitle?.trim() ?? '';
	return { src, width, height, alt };
}

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

	activeLightbox = pswp;
	pswp.on('destroy', () => {
		if (activeLightbox === pswp) activeLightbox = null;
	});
	pswp.init();
}

export function initGalleryLightbox(
	galleryRoot: HTMLElement,
	options?: { itemSelector?: string },
): void {
	const itemSelector = options?.itemSelector ?? '[data-gallery-item]';

	function visibleItems(): HTMLElement[] {
		return [...galleryRoot.querySelectorAll(itemSelector)].filter(
			(node): node is HTMLElement => node instanceof HTMLElement && !node.hidden,
		);
	}

	galleryRoot.querySelectorAll('[data-gallery-open]').forEach((button) => {
		button.addEventListener('click', () => {
			const item = button.closest(itemSelector);
			if (!(item instanceof HTMLElement)) return;

			const visible = visibleItems();
			const idx = visible.indexOf(item);
			if (idx < 0) return;

			const data = visible
				.map(itemFromElement)
				.filter((entry): entry is GalleryLightboxItem => entry !== null);
			if (data.length === 0) return;

			openGalleryLightbox(data, idx);
		});
	});
}
