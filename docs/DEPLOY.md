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
| Secrets | `R2_*` via `wrangler secret put` only |
| R2 CORS | `npm run r2:cors:apply` (or dashboard JSON paste) |
| Deploy | `npm run build && npx wrangler deploy` |

## 6. GitHub Actions CI/CD

Workflow: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).

| Trigger | What runs |
| --- | --- |
| Pull request | `npm test`, `npm run typecheck`, `npm run build`, `wrangler deploy --dry-run` |
| Push to `main` | Same checks, then `wrangler deploy` to production |

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Workers Scripts Edit** (and account access to D1/R2 bindings used by the Worker) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id (R2 / Workers overview) |

Worker **secrets** (`R2_*`) and **vars** (`CF_ACCESS_*` in `wrangler.jsonc`) stay on Cloudflare; CI does not upload them. Apply D1 migrations manually when schema changes (`wrangler d1 migrations apply photography --remote`).

Local parity: `npm run ci`.

Optional: create a GitHub **environment** named `production` on the repo if you want deployment approval gates; the deploy job references `environment: production`.

## Smoke checks

- `GET /health` — public bindings JSON (no R2 S3 secrets required)
- `GET /admin/api/health` — Access login redirect (302) without JWT; OK after Access session
- `/admin` — sign in via Access, then ingest / portfolio UI
