import { initGalleryLightbox } from './gallery-lightbox.ts';

export function initHomeGallery(root: HTMLElement): void {
	initCategoryFilter(root);
	initGalleryLightbox(root);
	initMasonryReflow(root);
}

function initCategoryFilter(galleryRoot: HTMLElement): void {
	const filterRoot = galleryRoot.querySelector('[data-category-filter]');
	const items = [...galleryRoot.querySelectorAll('[data-gallery-item]')];

	function setActiveChip(active: string) {
		filterRoot?.querySelectorAll('button[data-category]').forEach((button) => {
			if (!(button instanceof HTMLButtonElement)) return;
			const label = button.dataset.category ?? '';
			const isActive = label === active;
			button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
			button.style.borderColor = isActive ? 'var(--color-accent)' : 'var(--color-border)';
			button.style.color = isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)';
		});
	}

	function applyFilter(filter: string) {
		setActiveChip(filter);
		items.forEach((item) => {
			if (!(item instanceof HTMLElement)) return;
			const category = item.dataset.category ?? '';
			const show = filter === 'All' || (filter !== '' && category === filter);
			item.hidden = !show;
		});
		const grid = galleryRoot.querySelector('[data-gallery-grid]');
		if (grid instanceof HTMLElement) {
			// CSS columns reflow after visibility changes
			void grid.offsetHeight;
		}
	}

	filterRoot?.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLButtonElement) || !target.dataset.category) return;
		applyFilter(target.dataset.category);
	});
}

/** CSS-column masonry: nudge layout when lazy images finish loading. */
function initMasonryReflow(galleryRoot: HTMLElement): void {
	const grid = galleryRoot.querySelector('[data-gallery-grid]');
	if (!(grid instanceof HTMLElement)) return;

	const reflow = () => {
		void grid.offsetHeight;
	};

	grid.querySelectorAll('img').forEach((img) => {
		if (img.complete) return;
		img.addEventListener('load', reflow, { once: true });
	});
}
