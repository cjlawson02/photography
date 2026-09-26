# Public frontend (React islands)

Public pages use **Astro SSR** for data fetching and layout; interactive UI is **React** via `@astrojs/react`.

## Conventions

- Place public interactive components under `src/components/public/*.tsx`.
- Wire them from `.astro` pages with `client:*` directives (hydration boundary).
- Shared non-React helpers (e.g. PhotoSwipe opener) live under `src/lib/gallery/`.
- **Embla** and **PhotoSwipe** stay as imperative libraries inside React effects/handlers.
- Admin UI may remain Astro + inline scripts until migrated.

## Hydration choices

| Surface | Directive | Rationale |
| --- | --- | --- |
| Home hero carousel | `client:load` | Above the fold; autoplay and keyboard nav should work immediately. |
| Home masonry gallery | `client:visible` | Below hero; defer JS until the gallery scrolls into view. |
| Review gallery | `client:load` | Primary task on the page; selection + lightbox need JS on arrival. |

## Libraries

- [Embla Carousel](https://www.embla-carousel.com/) + autoplay — hero only.
- [PhotoSwipe 5](https://photoswipe.com/) — grid lightbox (`gallery.webp` URLs).
