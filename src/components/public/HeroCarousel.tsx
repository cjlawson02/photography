import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { PublicPortfolioPhoto } from '../../lib/services/portfolio-service.ts';

/** WP FlexSlider-style interval (theme option was often ~5s). */
const AUTOPLAY_DELAY_MS = 5000;

type Props = {
	photos: PublicPortfolioPhoto[];
};

export default function HeroCarousel({ photos }: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const emblaRef = useRef<ReturnType<typeof EmblaCarousel> | null>(null);
	const autoplayRef = useRef<ReturnType<typeof Autoplay> | null>(null);
	const [indicator, setIndicator] = useState('');

	const showNav = photos.length > 1;

	const scrollPrev = useCallback(() => {
		autoplayRef.current?.reset();
		emblaRef.current?.scrollPrev();
	}, []);

	const scrollNext = useCallback(() => {
		autoplayRef.current?.reset();
		emblaRef.current?.scrollNext();
	}, []);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport || photos.length <= 1) return;

		const autoplay = Autoplay({
			delay: AUTOPLAY_DELAY_MS,
			stopOnInteraction: false,
		});
		const embla = EmblaCarousel(viewport, { loop: true, align: 'start' }, [autoplay]);
		emblaRef.current = embla;
		autoplayRef.current = autoplay;

		const updateIndicator = () => {
			const total = embla.scrollSnapList().length;
			setIndicator(`${embla.selectedScrollSnap() + 1} / ${total}`);
		};

		embla.on('select', updateIndicator);
		updateIndicator();

		const root = rootRef.current;
		if (!root) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				scrollPrev();
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				scrollNext();
			}
		};
		root.addEventListener('keydown', onKeyDown);

		return () => {
			root.removeEventListener('keydown', onKeyDown);
			embla.destroy();
			emblaRef.current = null;
			autoplayRef.current = null;
		};
	}, [photos.length, scrollPrev, scrollNext]);

	if (photos.length === 0) return null;

	return (
		<section
			ref={rootRef}
			className="relative w-full overflow-hidden"
			style={{ background: 'var(--color-bg-elevated)' }}
			aria-label="Featured work"
			aria-roledescription="carousel"
			tabIndex={showNav ? 0 : undefined}
		>
			<div className="relative mx-auto" style={{ maxWidth: 1400 }}>
				<div className="overflow-hidden" ref={viewportRef}>
					<ul className="m-0 flex list-none touch-pan-y p-0">
						{photos.map((photo, index) => (
							<li
								key={photo.id}
								className="min-w-0 shrink-0 grow-0 basis-full"
								aria-roledescription="slide"
								aria-label={`Slide ${index + 1} of ${photos.length}`}
							>
								<img
									src={photo.galleryUrl}
									alt=""
									width={1600}
									height={900}
									decoding="async"
									fetchPriority={index === 0 ? 'high' : 'auto'}
									className="block max-h-[min(70vh,720px)] w-full object-cover"
								/>
							</li>
						))}
					</ul>
				</div>

				{showNav && (
					<>
						<button
							type="button"
							className="absolute top-1/2 left-2 z-10 -translate-y-1/2 border px-3 py-2 text-sm uppercase tracking-wide"
							style={{
								borderColor: 'var(--color-border)',
								color: 'var(--color-fg)',
								background: 'rgba(43, 43, 43, 0.75)',
							}}
							aria-label="Previous featured photo"
							onClick={scrollPrev}
						>
							Prev
						</button>
						<button
							type="button"
							className="absolute top-1/2 right-2 z-10 -translate-y-1/2 border px-3 py-2 text-sm uppercase tracking-wide"
							style={{
								borderColor: 'var(--color-border)',
								color: 'var(--color-fg)',
								background: 'rgba(43, 43, 43, 0.75)',
							}}
							aria-label="Next featured photo"
							onClick={scrollNext}
						>
							Next
						</button>
						<p
							className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-widest"
							style={{ color: 'var(--color-fg-muted)' }}
							aria-live="polite"
						>
							{indicator}
						</p>
					</>
				)}
			</div>
		</section>
	);
}
