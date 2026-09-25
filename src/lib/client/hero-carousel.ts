import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

/** WP FlexSlider-style interval (theme option was often ~5s). */
const AUTOPLAY_DELAY_MS = 5000;

export function initHeroCarousel(root: HTMLElement): void {
	const viewport = root.querySelector('[data-hero-viewport]');
	if (!(viewport instanceof HTMLElement)) return;

	const slideNodes = root.querySelectorAll('[data-hero-slide]');
	if (slideNodes.length <= 1) return;

	const autoplay = Autoplay({
		delay: AUTOPLAY_DELAY_MS,
		stopOnInteraction: false,
	});
	const embla = EmblaCarousel(viewport, { loop: true, align: 'start' }, [autoplay]);

	const indicator = root.querySelector('[data-hero-indicator]');
	const updateIndicator = () => {
		if (indicator) {
			const total = embla.scrollSnapList().length;
			indicator.textContent = `${embla.selectedScrollSnap() + 1} / ${total}`;
		}
	};

	embla.on('select', updateIndicator);
	updateIndicator();

	root.querySelector('[data-hero-prev]')?.addEventListener('click', () => {
		autoplay.reset();
		embla.scrollPrev();
	});
	root.querySelector('[data-hero-next]')?.addEventListener('click', () => {
		autoplay.reset();
		embla.scrollNext();
	});

	root.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			autoplay.reset();
			embla.scrollPrev();
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			autoplay.reset();
			embla.scrollNext();
		}
	});
}
