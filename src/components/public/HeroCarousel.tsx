import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import type { PublicPortfolioPhoto } from '../../lib/services/portfolio-service.ts';

/** WP FlexSlider-style interval (theme option was often ~5s). */
const AUTOPLAY_DELAY_MS = 5000;

type Props = {
	photos: PublicPortfolioPhoto[];
};

export default function HeroCarousel({ photos }: Props) {
	const viewportRef = useRef<HTMLDivElement>(null);
	const emblaRef = useRef<ReturnType<typeof EmblaCarousel> | null>(null);
	const autoplayRef = useRef<ReturnType<typeof Autoplay> | null>(null);
	const [indicator, setIndicator] = useState('');
	const [autoplayEnabled, setAutoplayEnabled] = useState(true);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	const showNav = photos.length > 1;
	const motionAutoplay = showNav && autoplayEnabled && !prefersReducedMotion;

	const scrollPrev = useCallback(() => {
		autoplayRef.current?.reset();
		emblaRef.current?.scrollPrev();
	}, []);

	const scrollNext = useCallback(() => {
		autoplayRef.current?.reset();
		emblaRef.current?.scrollNext();
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (!showNav) return;
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				scrollPrev();
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				scrollNext();
			}
		},
		[showNav, scrollPrev, scrollNext],
	);

	const toggleAutoplay = useCallback(() => {
		setAutoplayEnabled((prev) => {
			const next = !prev;
			const plugin = autoplayRef.current;
			if (plugin) {
				if (next) plugin.play();
				else plugin.stop();
			}
			return next;
		});
	}, []);

	useEffect(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => setPrefersReducedMotion(media.matches);
		apply();
		media.addEventListener('change', apply);
		return () => media.removeEventListener('change', apply);
	}, []);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport || photos.length <= 1) return;

		const autoplay = Autoplay({
			delay: AUTOPLAY_DELAY_MS,
			stopOnInteraction: false,
		});
		const plugins = motionAutoplay ? [autoplay] : [];
		const embla = EmblaCarousel(viewport, { loop: true, align: 'start' }, plugins);
		emblaRef.current = embla;
		autoplayRef.current = autoplay;

		if (!motionAutoplay) {
			autoplay.stop();
		}

		const updateIndicator = () => {
			const total = embla.scrollSnapList().length;
			setIndicator(`${embla.selectedScrollSnap() + 1} / ${total}`);
		};

		embla.on('select', updateIndicator);
		updateIndicator();

		return () => {
			embla.destroy();
			emblaRef.current = null;
			autoplayRef.current = null;
		};
	}, [photos.length, motionAutoplay]);

	if (photos.length === 0) return null;

	const pauseLabel = autoplayEnabled ? 'Pause automatic slide show' : 'Resume automatic slide show';

	return (
		<section
			className="public-hero"
			aria-label="Featured work"
			aria-roledescription="carousel"
			tabIndex={showNav ? 0 : undefined}
			onKeyDown={handleKeyDown}
		>
			<div className="public-hero__frame">
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
							className="public-hero__nav-btn public-hero__nav-btn--prev"
							aria-label="Previous featured photo"
							onClick={scrollPrev}
						>
							Prev
						</button>
						<button
							type="button"
							className="public-hero__nav-btn public-hero__nav-btn--next"
							aria-label="Next featured photo"
							onClick={scrollNext}
						>
							Next
						</button>
						{!prefersReducedMotion ? (
							<button
								type="button"
								className="public-hero__pause-btn"
								aria-pressed={!autoplayEnabled}
								aria-label={pauseLabel}
								onClick={toggleAutoplay}
							>
								{autoplayEnabled ? 'Pause' : 'Play'}
							</button>
						) : null}
						<p className="public-hero__indicator m-0" aria-hidden="true">
							{indicator}
						</p>
					</>
				)}
			</div>
		</section>
	);
}
