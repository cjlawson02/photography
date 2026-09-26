# Frontend (React islands)

Interactive UI uses **React** via `@astrojs/react`. Astro pages own layout and SSR; islands own client state (no hand-rolled `addEventListener` / DOM wiring).

## Conventions

- Public components: `src/components/public/*.tsx`
- Admin interactive components: `src/components/admin/*.tsx`
- Admin workflows / IA (product): [ADMIN-UX.md](ADMIN-UX.md) — this file covers hydration and libraries only.
- Admin client→server: **tRPC** via `src/lib/trpc/client.ts` → `/admin/api/trpc` (typed procedures; do not add new ad-hoc `fetch('/admin/api/...')` in islands).
- Admin forms: **react-hook-form** + `@hookform/resolvers/zod`; client field schemas in `src/lib/admin/admin-form-schemas.ts` (server/tRPC Zod in `src/lib/admin/*-schemas.ts`).
- Missing R2 S3 secrets surface as **503** on ingest procedures only (`ingest.*`); other admin routes use bindings-only env and still return **403** when Access JWT is missing.
- If Access serves an HTML login or redirect instead of JSON, the tRPC client calls **`location.reload()`** so the browser can complete Cloudflare Access.
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
| Admin review collection detail | `client:load` | Same as list; SSR seeds collection + photos for first paint. |

Admin **portfolio**, **review list**, and **review collection detail** pages load D1 data in Astro frontmatter (`AppEnv.fromBindings` + the same services as tRPC) and pass results into islands as optional `initial*` props. Islands seed TanStack Query with `initialData` and a mount-time `initialDataUpdatedAt` (`useState(() => Date.now())` so render stays pure) so the default `staleTime` (30s in `query-client.ts`) avoids an immediate duplicate tRPC read after hydration. Mutations, invalidation, portfolio “load more”, and `stalePendingOnly: true` stay client-only. Missing review collection ids redirect to `/admin/review` during SSR.

## Libraries

- [Embla Carousel](https://www.embla-carousel.com/) + autoplay — hero only.
- [PhotoSwipe 5](https://photoswipe.com/) — grid lightbox (`gallery.webp` URLs).

## Tests (Vitest + RTL)

Admin UI tests live in `src/**/*.vitest.{ts,tsx}` (`npm run test:vitest`; `npm test` also runs node:test). Prefer **`@testing-library/user-event`** (`await userEvent.click()`, `type()`, etc.) over `fireEvent` from `@testing-library/react`; use `fireEvent` only when user-event cannot cover the case and leave a brief comment explaining why. Admin Sentry init is covered in `sentry-browser.vitest.ts`; production client source maps upload only on deploy when Sentry env vars are set ([DEPLOY.md](DEPLOY.md#3a-sentry-optional-worker-errors)).
