# AGENTS.md

README for coding agents. Complements [README.md](README.md) (humans) — do not duplicate it.

User chat instructions override this file. Closest `AGENTS.md` wins if nested later.

## Project overview

Photography website for Chris Lawson. Details live in docs; start from the pointer map below.

## Build and test commands

Requires Node `>=22.12.0` (Astro 7). Prefer a current Node 22 LTS if the environment’s default is older.

```bash
npm install
npm run generate-types   # wrangler types → worker-configuration.d.ts (needs valid wrangler.jsonc)
npm run typecheck        # wrangler types && astro check
npm run build            # astro build (Workers SSR bundle + static assets in dist/)
npm run dev              # astro dev (workerd via @astrojs/cloudflare)
```

D1 migrations live in `src/db/migrations/` (flat SQL). That directory is empty until real schema lands (columns `_TBD_` in [HLD](docs/HLD.md)). When SQL files exist:

```bash
npm run db:migrate:local # wrangler d1 migrations apply lawson-photography --local
```

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

## Testing instructions

Phase 0 smoke:

- `GET /health` — public binding presence JSON
- `GET /admin/api/health` — requires Access JWT (`Cf-Access-Jwt-Assertion`); returns 403 without it

Full feature tests `_TBD_`.

## Security considerations

- Never commit `.dev.vars`, Access AUD, or R2 S3 API keys. Use `.dev.vars.example` as the inventory template.
- Copy `.dev.vars.example` → `.dev.vars` for local; production via `npx wrangler secret put <NAME>`.
- Required secrets / config (values owned by Chris — do not invent):
  - `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (presigned PUT; not covered by R2 bindings alone)
  - Replace D1 `database_id` in `wrangler.jsonc` after `npx wrangler d1 create lawson-photography`
  - Create private R2 buckets matching `lawson-portfolio` / `lawson-review` (or rename bindings’ `bucket_name`)
  - Configure R2 CORS on both buckets: admin origin + `PUT` (see [HLD Architecture](docs/HLD.md#architecture))
  - Cloudflare Access application covering `/admin*`
- Admin mutations live only under `/admin/api/*` and must call `verifyAccessJwt` ([HLD Admin auth](docs/HLD.md#admin-auth)).

## Commit and PR guidelines

_TBD_

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
| Agent instructions | This file |

Treat this file as living documentation: prune stale rules and fill `_TBD_` sections when decided.
