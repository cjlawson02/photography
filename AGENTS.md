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
npm run lint             # oxlint (react, jsx-a11y, typescript)
npm run format           # oxfmt --write (TS/TSX/JSON; not .astro)
npm run format:check     # oxfmt --check
npm run typecheck        # wrangler types && astro check
npm run build            # astro build (Workers SSR bundle + static assets in dist/)
npm run dev              # astro dev (workerd via @astrojs/cloudflare)
npm run ci               # lint + format:check + test + typecheck + build + wrangler deploy --dry-run
```

### D1 / Drizzle

Schema: FamilyNotes-style PascalCase tables + camelCase columns under `src/db/schema/`.
Migrations: `drizzle-kit generate` → SQL in `src/db/migrations/` → wrangler apply.

```bash
npm run db:generate      # drizzle-kit generate (no Cloudflare credentials)
npm run db:migrate:local # wrangler d1 migrations apply photography --local
npm run db:migrate:check # CI gate: ephemeral local apply + fail on unapplied SQL
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

- **Lint:** [oxlint](https://oxc.rs/docs/guide/usage/linter.html) via `npm run lint` — config `.oxlintrc.json` (react, jsx-a11y, typescript). `.astro` files are excluded (no Astro parser).
- **Format:** [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) via `npm run format` / `format:check` — config `.oxfmtrc.json` (100 cols, single quotes). `.astro` is excluded until oxfmt supports it.

### Public client UI

- **React islands** (`@astrojs/react`) for interactive UI — conventions in [docs/FRONTEND.md](docs/FRONTEND.md).
- Admin workflows / patterns (v2): [docs/ADMIN-UX.md](docs/ADMIN-UX.md).

## Testing instructions

- Phase 0 / manual smoke: [docs/SMOKE.md](docs/SMOKE.md)
- Auth, tRPC mount, admin JWT: [docs/HLD.md#admin-auth](docs/HLD.md#admin-auth)
- Unit: `npm test` — **node:test** (`src/**/*.test.ts`), **Vitest jsdom** (`src/**/*.vitest.{ts,tsx}`), **Vitest node** (`src/**/*.server.vitest.ts`). Remaining `node:test` / workerd pool backlog: [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) (T1 / FIX-28). End-to-end upload against live R2/Images `_TBD_` until Access + CORS + secrets are set.
- Ingest tip: `AppEnv.from` on **`ingest.*` only** fail-fast (503) without R2 S3 secrets; other admin tRPC is bindings-only and returns **403** without JWT. Local secrets: [`.dev.vars.example`](.dev.vars.example) → `.dev.vars` ([DEPLOY.md](docs/DEPLOY.md)).

## Security considerations

- Never commit `.dev.vars` or R2 S3 API keys. Template: [`.dev.vars.example`](.dev.vars.example).
- Required config (Access, secrets, CORS, Sentry, CI/CD): [docs/DEPLOY.md](docs/DEPLOY.md).
- Admin mutations verify the Access JWT — [HLD Admin auth](docs/HLD.md#admin-auth).

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

Human doc index: [README.md](README.md). Agent-focused shortcuts:

| Need                                  | Read                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Architecture / auth / ingest          | [docs/HLD.md](docs/HLD.md)                                                   |
| Phase tasks / backlog IDs             | [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)                             |
| Estimates                             | [docs/LOE.md](docs/LOE.md)                                                   |
| Status / Gantt / changelog            | [docs/PROGRESS.md](docs/PROGRESS.md)                                         |
| Deploy / Access / secrets / CORS / CI | [docs/DEPLOY.md](docs/DEPLOY.md)                                             |
| Manual smoke                          | [docs/SMOKE.md](docs/SMOKE.md)                                               |
| Cutover runbook                       | [docs/CUTOVER.md](docs/CUTOVER.md)                                           |
| Public React islands                  | [docs/FRONTEND.md](docs/FRONTEND.md)                                         |
| Admin product UX                      | [docs/ADMIN-UX.md](docs/ADMIN-UX.md)                                         |
| Legacy import                         | [docs/migration/legacy-bulk-import.md](docs/migration/legacy-bulk-import.md) |
| Agent commands                        | This file                                                                    |

Treat this file as living documentation: prune stale rules and fill `_TBD_` sections when decided.
