import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { GALLERY_VARIANT } from '../../lib/ingest/keys.ts';
import type { PublicPortfolioPhoto } from '../../lib/services/portfolio-service.ts';

const AUTOPLAY_DELAY_MS = 6500;

type Props = {
  photos: PublicPortfolioPhoto[];
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      {playing ? (
        <path d="M8 5h2.5v14H8zM13.5 5H16v14h-2.5z" fill="currentColor" />
      ) : (
        <path d="M8 5l11 7-11 7z" fill="currentColor" />
      )}
    </svg>
  );
}

export default function HeroCarousel({ photos }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const emblaRef = useRef<ReturnType<typeof EmblaCarousel> | null>(null);
  const autoplayRef = useRef<ReturnType<typeof Autoplay> | null>(null);
  const [selected, setSelected] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const total = photos.length;
  const showNav = total > 1;
  const motionAutoplay = showNav && autoplayEnabled && !prefersReducedMotion;
  const current = photos[selected] ?? photos[0];

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
    setAutoplayEnabled((prev) => !prev);
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

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const autoplay = Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: false,
    });
    const embla = EmblaCarousel(
      viewport,
      { loop: true, align: 'start', duration: reduced ? 10 : 42 },
      [autoplay],
    );
    emblaRef.current = embla;
    autoplayRef.current = autoplay;

    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();

    return () => {
      embla.destroy();
      emblaRef.current = null;
      autoplayRef.current = null;
    };
  }, [photos.length]);

  useEffect(() => {
    const plugin = autoplayRef.current;
    if (!plugin) return;
    if (motionAutoplay) {
      plugin.play();
    } else {
      plugin.stop();
    }
  }, [motionAutoplay]);

  if (total === 0) return null;

  const pauseLabel = autoplayEnabled ? 'Pause automatic slide show' : 'Resume automatic slide show';
  const currentTitle = current?.title?.trim();
  const currentCaption = current?.caption?.trim();
  const currentCategory = current?.category?.trim();

  return (
    <section
      className="public-hero"
      aria-label="Featured work"
      aria-roledescription="carousel"
      tabIndex={showNav ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={{ '--hero-delay': `${AUTOPLAY_DELAY_MS}ms` } as CSSProperties}
    >
      <div className="public-hero__viewport" ref={viewportRef}>
        <ul className="public-hero__track">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="public-hero__slide"
              data-active={index === selected}
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${total}`}
            >
              <img
                src={photo.galleryUrl}
                alt={photo.alt?.trim() ?? ''}
                width={photo.width ?? GALLERY_VARIANT.width}
                height={photo.height ?? 900}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                loading={index === 0 ? 'eager' : 'lazy'}
                className="public-hero__img"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="public-hero__scrim" aria-hidden="true" />

      <div className="public-hero__content">
        <div className="public-hero__copy">
          <div key={selected} className="public-hero__card">
            {currentCategory ? <p className="public-hero__category">{currentCategory}</p> : null}
            {currentTitle ? <p className="public-hero__title">{currentTitle}</p> : null}
            {currentCaption && currentCaption !== currentTitle ? (
              <p className="public-hero__caption">{currentCaption}</p>
            ) : null}
          </div>
          <a href="#gallery" className="public-hero__cta">
            <span>View the gallery</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path
                d="M12 5v14M6 13l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
          </a>
        </div>
        {showNav && (
          <div className="public-hero__controls">
            <p className="public-hero__counter" aria-hidden="true">
              <span className="public-hero__counter-current">{pad2(selected + 1)}</span>
              <span className="public-hero__counter-sep">/</span>
              {pad2(total)}
            </p>
            <button
              type="button"
              className="public-hero__btn"
              aria-label="Previous featured photo"
              onClick={scrollPrev}
            >
              <Chevron direction="left" />
            </button>
            {!prefersReducedMotion ? (
              <button
                type="button"
                className="public-hero__btn"
                aria-pressed={!autoplayEnabled}
                aria-label={pauseLabel}
                onClick={toggleAutoplay}
              >
                <PlayPauseIcon playing={autoplayEnabled} />
              </button>
            ) : null}
            <button
              type="button"
              className="public-hero__btn"
              aria-label="Next featured photo"
              onClick={scrollNext}
            >
              <Chevron direction="right" />
            </button>
          </div>
        )}
      </div>

      {showNav && (
        <div className="public-hero__progress" aria-hidden="true">
          <span
            key={selected}
            className="public-hero__progress-bar"
            data-running={motionAutoplay}
          />
        </div>
      )}
    </section>
  );
}
