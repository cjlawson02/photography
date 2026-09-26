# Frontend (React islands)

Interactive UI uses **React** via `@astrojs/react`. Astro pages own layout and SSR; islands own client state (no hand-rolled `addEventListener` / DOM wiring).

## Conventions

- Public components: `src/components/public/*.tsx`
- Admin interactive components: `src/components/admin/*.tsx`
- Wire islands from `.astro` with `client:*` directives.
- Shared non-React helpers (e.g. PhotoSwipe opener) live under `src/lib/gallery/`.
- **Embla** and **PhotoSwipe** stay as imperative libraries inside React effects/handlers.
## Hydration choices

| Surface | Directive | Rationale |
| --- | --- | --- |
| Home hero carousel | `client:load` | Above the fold; autoplay and keyboard nav should work immediately. |
| Home masonry gallery | `client:visible` | Below hero; defer JS until the gallery scrolls into view. |
| Review gallery | `client:load` | Primary task on the page; selection + lightbox need JS on arrival. |
| Admin portfolio table | `client:load` | Access-gated; table edits need JS on arrival. |
| Admin ingest upload | `client:load` | Primary task; presigned upload flow needs JS on arrival. |
| Admin review collections | `client:load` | Create/list/revoke and copy links on arrival. |

## Libraries

- [Embla Carousel](https://www.embla-carousel.com/) + autoplay — hero only.
- [PhotoSwipe 5](https://photoswipe.com/) — grid lightbox (`gallery.webp` URLs).
