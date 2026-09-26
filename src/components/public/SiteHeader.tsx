import { useEffect, useState } from 'react';

import { SITE_NAME } from '../../lib/site/public-meta.ts';
import ApertureMark from './ApertureMark.tsx';

type Props = {
  /** Transparent header laid over a full-bleed hero; turns solid once the page scrolls. */
  overlay?: boolean;
};

const SOLID_AFTER_PX = 24;

export default function SiteHeader({ overlay = false }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const update = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [overlay]);

  const solid = !overlay || scrolled;

  return (
    <header
      className={`public-header${overlay ? ' public-header--overlay' : ''}`}
      data-solid={solid}
    >
      <div className="public-header__inner">
        <a href="/" className="public-header__brand">
          <ApertureMark className="public-header__mark" />
          <span className="public-header__wordmark">{SITE_NAME}</span>
        </a>
        <nav className="public-header__nav" aria-label="Primary">
          <a href="/#gallery" className="public-header__nav-link">
            Portfolio
          </a>
        </nav>
      </div>
    </header>
  );
}
