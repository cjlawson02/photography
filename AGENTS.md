# AGENTS.md

README for coding agents. Complements [README.md](README.md) (humans) — do not duplicate it.

User chat instructions override this file. Closest `AGENTS.md` wins if nested later.

## Project overview

Photography website for Chris Lawson. Details live in docs; start from the pointer map below.

## Build and test commands

Requires Node `>=24.0.0` (Astro 7). CI uses Node 24.

```bash
npm install
npm run generate-types   # wrangler types → worker-configuration.d.ts (needs valid wrangler.jsonc)
npm run typecheck        # wrangler types && astro check
npm run build            # astro build (Workers SSR bundle + static assets in dist/)
npm run dev              # astro dev (workerd via @astrojs/cloudflare)
npm run ci               # test + typecheck + build + wrangler deploy --dry-run
```

### D1 / Drizzle

Schema: FamilyNotes-style PascalCase tables + camelCase columns under `src/db/schema/`.
Migrations: `drizzle-kit generate` → SQL in `src/db/migrations/` → wrangler apply.

```bash
npm run db:generate      # drizzle-kit generate (no Cloudflare credentials)
npm run db:migrate:local # wrangler d1 migrations apply photography --local
# Remote (after review): npx wrangler d1 migrations apply photography --remote
npm run r2:cors:apply    # apply infra/r2-cors/*.json to both buckets (wrangler login)
npm run r2:cors:list     # verify bucket CORS policies
```

Optional drizzle-kit d1-http introspect/push (not required for generate→apply) needs env vars — do not commit tokens:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_TOKEN` (API token with D1 edit)

Known D1: name `photography`, id `4f01bd2c-355d-4501-914d-7cb9cf68a70c` (see `wrangler.jsonc`).

Validate the Workers bundle without uploading (after `npm run build`):

```bash
npx wrangler deploy --dry-run
```

Deploy (after Cloudflare account resources exist — D1 id, R2 buckets, secrets):

```bash
npx wrangler deploy
```

## Code style guidelines

_TBD — only rules that differ from language/tool defaults._

### Public client UI

- **React islands** (`@astrojs/react`) for public interactive UI — no vanilla `src/lib/client/*` DOM wiring or page `<script>` blocks for home/review.
- See [docs/FRONTEND.md](docs/FRONTEND.md) for hydration conventions and library usage.
- Admin can stay Astro + scripts until migrated.

## Testing instructions

Phase 0 smoke:

- `GET /health` — public binding + DAO presence JSON (does **not** require R2 S3 secrets)
- `GET /admin/api/health` — requires Access JWT (`Cf-Access-Jwt-Assertion`); returns 403 without it; also bindings-only (no R2_*)

Unit: `npm test` (Cloudflare env zod, AppError HTTP mapping, ingest keys/presign schema). End-to-end upload against live R2/Images `_TBD_` until Access + CORS + secrets are set.

Ingest (`AppEnv.from` / `getCloudflareEnv`) **fail-fast** if `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` are missing (503). Copy `.dev.vars.example` → `.dev.vars` and fill R2_* for `/admin` ingest preview.

Phase 1 ingest (JWT + Zod body → `IngestService`):

- `POST /admin/api/ingest/presign` — pending row + presigned PUT (`portfolio` | `review`; review requires `collectionId`)
- `POST /admin/api/ingest/complete` — Images compress-once → variant puts → ready/failed
- `POST /admin/api/ingest/reprocess` — re-run from original
- Minimal smoke UI: `/admin`

## Security considerations

- Never commit `.dev.vars` or R2 S3 API keys. Use `.dev.vars.example` as the inventory template.
- Copy `.dev.vars.example` → `.dev.vars` for local.
- Required config (see [docs/DEPLOY.md](docs/DEPLOY.md)):
  - `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` — plain **vars** in `wrangler.jsonc` (identifiers, not credentials)
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — production via `npx wrangler secret put <NAME>` (presigned PUT; not covered by R2 bindings alone)
  - D1 + R2 resource names are wired in `wrangler.jsonc` (`photography`, `photography-portfolio`, `photography-review`)
  - Configure R2 CORS on both buckets: `npm run r2:cors:apply`
  - Cloudflare Access **Public DNS** app on `photography.chrislawson.dev` path `/admin*` (not Workers destination)
- Admin mutations live only under `/admin/api/*` and must call `verifyAccessJwt` ([HLD Admin auth](docs/HLD.md#admin-auth)).

## Commit and PR guidelines

- CI must pass before merge ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)); local: `npm run ci`.
- `main` deploys the Worker via GitHub Actions when Cloudflare secrets are configured ([DEPLOY.md](docs/DEPLOY.md#6-github-actions-cicd)).

## Documentation

- Prefer Mermaid for diagrams; one diagram per topic, in its canonical doc only.
- Leave unknowns as `_TBD_`. Do not invent product, stack, or schedule details.
- Keep docs lean. Link; do not restate.

### DRY — do not mirror or duplicate

- One source of truth per fact, diagram, estimate, or decision.
- Link or reference; never copy the same content into another file.
- If two docs need the same information, put it in one place and point the other at it.
- When updating shared information, edit only the canonical location.

### Pointer map

| Need | Read |
| --- | --- |
| Human overview / doc index | [README.md](README.md) |
| Architecture / design | [docs/HLD.md](docs/HLD.md) |
| Implementation plan | [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) |
| Estimates | [docs/LOE.md](docs/LOE.md) |
| Status, Gantt schedule, changelog | [docs/PROGRESS.md](docs/PROGRESS.md) |
| Public React islands | [docs/FRONTEND.md](docs/FRONTEND.md) |
| Manual smoke checklist | [docs/SMOKE.md](docs/SMOKE.md) |
| Agent instructions | This file |

Treat this file as living documentation: prune stale rules and fill `_TBD_` sections when decided.
