# Deploy & production hostname

**Production host:** `https://photography.chrislawson.dev` — public site, admin (`/admin*`), and (later) client review at `/review/{slug}` on the same host.

Canonical architecture and delivery rules: [HLD.md](HLD.md). Commands and secrets inventory: [AGENTS.md](../AGENTS.md).

## 1. Worker custom domain

`wrangler.jsonc` declares a Workers **custom domain** route for `photography.chrislawson.dev` (see `routes` with `custom_domain: true`). On first deploy with a logged-in Wrangler session, Cloudflare creates the DNS record when the zone `chrislawson.dev` is on the same account.

```bash
npm run build
npx wrangler deploy
```

If the zone is on another account or DNS is managed externally, add a `CNAME` for `photography` → the Worker hostname shown in the dashboard after deploy, or attach the custom domain manually under **Workers & Pages → lawson-photography → Settings → Domains & Routes**.

`workers.dev` remains available for smoke tests unless you disable it in the dashboard.

## 2. Cloudflare Access (admin)

Create a **Self-hosted** Access application with a **Public DNS** destination (hostname + path). Do **not** use the **Workers** destination — that protects the entire Worker and would lock the public site.

| Field | Value |
| --- | --- |
| Destination | Public DNS |
| Application domain | `photography.chrislawson.dev` |
| Path | `/admin*` |
| Policy | Allow Chris (email / identity provider) |

From the application settings, copy:

- **Team domain** → `CF_ACCESS_TEAM_DOMAIN` (host or `https://<team>.cloudflareaccess.com`; code normalizes either)
- **Application Audience (AUD) Tag** → `CF_ACCESS_AUD`

These are identifiers, not credentials. Set them as plain Worker **vars** in [`wrangler.jsonc`](../wrangler.jsonc) (committed) — not `wrangler secret put` (same name cannot be both a var and a secret).

For local admin JWT checks, put the same values in `.dev.vars` (from [`.dev.vars.example`](../.dev.vars.example)).

Admin browser uploads use **presigned PUT** to R2; the admin UI origin must be listed in R2 CORS (step 3).

## 3. R2 S3 API secrets (presigned PUT)

R2 **bindings** do not replace S3-compatible credentials for browser uploads. Create tokens in the dashboard: **R2 → Overview → Account details → API Tokens → Manage** → create with **Object Read & Write** on `photography-portfolio` and `photography-review`. Copy Access Key ID + Secret Access Key (secret shown once). Account ID is on the R2 / Workers overview.

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Local: copy `.dev.vars.example` → `.dev.vars` and fill the same three keys plus Access vars.

## 3a. Sentry (optional Worker errors)

Server-side error monitoring uses `@sentry/cloudflare` via [`sentry.server.config.ts`](../sentry.server.config.ts) (custom Worker entry in `wrangler.jsonc`). When `SENTRY_DSN` is unset, the SDK is a no-op — safe for local dev without a project.

Create a Sentry project (Cloudflare / JavaScript) and copy the DSN. **Do not commit the DSN** — store it as a Worker secret:

```bash
npx wrangler secret put SENTRY_DSN
```

**Release:** GitHub Actions sets Worker var `SENTRY_RELEASE` to `${{ github.sha }}` on each production deploy (`wrangler deploy --var SENTRY_RELEASE:<sha>`). That value is passed to Sentry as `release` when the DSN is configured ([`sentryOptionsFromEnv`](../src/lib/observability/sentry.ts)). Do not store release as a secret.

Local: add `SENTRY_DSN=` to `.dev.vars`; optionally set `SENTRY_RELEASE=` (e.g. `photography@local`) for release grouping in dev. When the DSN is set, admin pages mount [`AdminSentryInit`](../src/components/admin/AdminSentryInit.tsx) (`@sentry/react`) from [`AdminLayout`](../src/layouts/AdminLayout.astro).

**Source maps (CI / production deploy):** Worker maps upload via `upload_source_maps` in [`wrangler.jsonc`](../wrangler.jsonc) and `wrangler deploy --upload-source-maps` (release var `SENTRY_RELEASE=${{ github.sha }}`). Client/admin bundles upload during `npm run build` when these **GitHub Actions secrets** are set (build-time only — not Worker secrets):

| Secret | Purpose |
| --- | --- |
| `SENTRY_AUTH_TOKEN` | Auth for Wrangler + `@sentry/vite-plugin` uploads |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

Without those secrets, deploy still succeeds; maps are skipped and the Vite plugin is not enabled.

## 4. R2 CORS (IaC)

CORS JSON lives under [`infra/r2-cors/`](../infra/r2-cors/). Origins: production host and `http://localhost:4321` for `astro dev`.

```bash
npm run r2:cors:apply    # set policy on both buckets (-y skips confirm)
npm run r2:cors:list     # verify
```

Requires `wrangler login` (or `CLOUDFLARE_API_TOKEN` with R2 edit). Does not use `.dev.vars` R2 S3 keys.

## 5. D1 migrations (remote)

After reviewing generated SQL:

```bash
npx wrangler d1 migrations apply photography --remote
```

## Dashboard-only checklist

| Item | Notes |
| --- | --- |
| DNS | Automatic if zone on account + custom domain deploy; else manual `CNAME` |
| Access app | Public DNS path `/admin*` on `photography.chrislawson.dev` |
| Access vars | `CF_ACCESS_*` in `wrangler.jsonc` vars (redeploy) |
| Secrets | `R2_*` via `wrangler secret put`; optional `SENTRY_DSN` |
| Sentry release | `SENTRY_RELEASE` Worker var from CI deploy (`github.sha`) |
| Sentry source maps (CI) | Optional GitHub secrets `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| R2 CORS | `npm run r2:cors:apply` (or dashboard JSON paste) |
| Deploy | `npm run build && npx wrangler deploy` |

## 6. GitHub Actions CI/CD

Workflow: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

| Trigger | What runs |
| --- | --- |
| Pull request | Node 24 — lint, format check, `npm test`, `npm run typecheck`, `npm run build`, `wrangler deploy --dry-run` |
| Push to `main` | Same checks, then `wrangler d1 migrations apply photography --remote`, then `wrangler deploy` to production |

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Workers Scripts Edit**, **D1 Edit** (or permission to apply migrations on `photography`), and account access to D1/R2 bindings used by the Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id (R2 / Workers overview) |

Worker **secrets** (`R2_*`, optional `SENTRY_DSN`) stay on Cloudflare; CI does not upload them. **Vars:** `CF_ACCESS_*` in [`wrangler.jsonc`](../wrangler.jsonc); deploy also sets `SENTRY_RELEASE` to the commit SHA (`github.sha`) via `wrangler deploy --var`. **Push to `main`** runs remote D1 migrations in the deploy job before the Worker deploy. For local or emergency apply without deploy: `npx wrangler d1 migrations apply photography --remote`.

Local parity: `npm run ci`.

Optional: create a GitHub **environment** named `production` on the repo if you want deployment approval gates; the deploy job references `environment: production`.

## Smoke checks

Full manual checklist: [SMOKE.md](SMOKE.md).

- `GET /health` — public bindings JSON (no R2 S3 secrets required)
- `GET /admin/api/health` — Access login redirect (302) without JWT; OK after Access session
- `/admin` — sign in via Access, then ingest / portfolio UI
