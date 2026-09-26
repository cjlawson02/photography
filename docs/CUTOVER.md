# Cutover runbook (Phase 5)

Move production traffic from the legacy WordPress site to the Workers deployment. Architecture and delivery constraints live in [HLD.md](HLD.md); phase checklist in [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover).

**Status:** **cutover complete** (Chris, 2026-09-26) — see [Current truth](#current-truth-2026-09-26). Finish **post-cutover monitoring** setup ([§6](#6-post-cutover-monitoring)). Picu/review import _TBD_ only if needed later.

## Sequencing

Order: **T7 migration** → **T6 cutover sequence** → **post-cutover monitoring** (in progress).

**Chris (2026-09-26):** Phase 5 **cutover** steps in [Cutover sequence (after migration)](#cutover-sequence-after-migration) run **only after** [T7 bulk migration](#content-and-asset-migration-t7) is complete and signed off. Do not treat remote promote + production smoke as the formal cutover gate until imported content is on production.

## Current truth (2026-09-26)

| Item | Status |
| --- | --- |
| Workers production host `https://photography.chrislawson.dev` | **Live** — custom domain + SSL on Workers ([DEPLOY.md](DEPLOY.md)) |
| Legacy public site `lawsonphotography.me` (+ `www`) | **301** → `https://photography.chrislawson.dev` — verified (Chris, 2026-09-26) |
| Admin Access on `/admin*` | **Verified** on production smoke (Chris, 2026-09-26); re-check after Access or DNS changes ([DEPLOY.md](DEPLOY.md)) |
| Production smoke | **Pass** — [SMOKE.md](SMOKE.md) on `photography.chrislawson.dev` (Chris, 2026-09-26) |
| Remote D1 migrations on production | **Applied** — production `d1_migrations` matches repo (**5/5**); latest `main` deploy reported no pending migrations (2026-09-26) |
| Bulk legacy WordPress → D1/R2 **portfolio** import | **Done** — source, counts, NAS path: [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md) |
| Legacy WordPress hosting | **Decommissioned** (Chris, 2026-09-26) |
| Path-specific legacy redirect map | **Not needed** — zone **301** sufficient (Chris, 2026-09-26) |

## Chris input needed

Resolved for T7 portfolio import — details in [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md) (export, metadata mapping, Picu out of scope, remote sign-off).

Still open:

1. **RTO/RPO and rollback owner** — who flips DNS/redirects and whether Workers rollback (`wrangler rollback` / redeploy prior SHA) is in scope.

Redirect map: **not needed** (see [Current truth](#current-truth-2026-09-26)).

## Preconditions

- [x] Production Cloudflare resources wired in [DEPLOY.md](DEPLOY.md) (D1 id, R2 buckets, Access vars, secrets inventory documented)
- [x] CI/CD green on `main` ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)) immediately before promote (verified run `36222384679` @ `f4da23c`, 2026-09-26)
- [x] Manual smoke pass on production host — [SMOKE.md](SMOKE.md) (Chris, 2026-09-26; review slug N/A — no Picu collections)
- [x] Remote D1 journal matches repo (`npx wrangler d1 migrations list photography --remote`) — confirmed via production D1 + CI deploy migrate step (2026-09-26)

## DNS and domain

Hostnames and Access status: [Current truth](#current-truth-2026-09-26). Procedure:

| Step | Owner | Notes |
| --- | --- | --- |
| Workers custom domain + SSL for `photography.chrislawson.dev` | **Done** | See Current truth |
| Access application covers `/admin*` on `photography.chrislawson.dev` | **Done** | See Current truth |
| **301 redirect** `lawsonphotography.me` (+ `www`) → `photography.chrislawson.dev` | **Done** | Redirect Rules on legacy zone |
| Lower TTL on legacy DNS | _Optional_ | Note if origin DNS changes again |

Path-specific permalink redirects: **not needed** (see Current truth).

## Content and asset migration (T7)

Checklist and import details: [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md). Portfolio import **done**; that satisfied the gate for [cutover sequence](#cutover-sequence-after-migration). Ongoing portfolio edits use admin ingest on the Workers host. Review/Picu and path redirect map: see Current truth.

## Cutover sequence (after migration)

**Prerequisite:** Portfolio T7 import **complete** (see Current truth). Run production [SMOKE.md](SMOKE.md) on imported gallery content as part of step 4 below.

Execute in order for formal cutover completion. **Do not** run remote migrations or production deploy without explicit approval when schema is in flux.

### 1. Freeze (optional)

- [ ] Pause legacy WordPress edits if they would diverge from the import snapshot (_TBD_ — Chris; typically **before** the migration snapshot, not after).

### 2. Database

```bash
npx wrangler d1 migrations list photography --remote
# After review:
npx wrangler d1 migrations apply photography --remote
```

CI on `main` also applies remote migrations when configured ([DEPLOY.md](DEPLOY.md#6-github-actions-cicd)).

### 3. Deploy sequence

```bash
npm run ci          # local gate before promote
npm run build
npx wrangler deploy # or merge to main and let GitHub Actions deploy
```

Confirm `SENTRY_RELEASE` / source maps if Sentry vars are set ([DEPLOY.md](DEPLOY.md#3a-sentry-optional-worker-errors)).

### 4. Production smoke

- [x] [SMOKE.md](SMOKE.md) on production host — see [Current truth](#current-truth-2026-09-26)

### 5. Legacy traffic

- [x] Zone **301** and deep-link map decision — see [Current truth](#current-truth-2026-09-26)

### 6. Post-cutover monitoring

Watch **24–48h** after cutover sign-off (from 2026-09-26). Code already enables Workers Observability ([`wrangler.jsonc`](../wrangler.jsonc) `observability.enabled: true`).

**Setup checklist**

- [x] Workers Observability enabled on `lawson-photography` (repo config)
- [ ] **Dashboard** — Workers & Pages → `lawson-photography` → Observability: scan errors and p99 latency daily during the watch window
- [ ] **Sentry** (recommended) — production Worker secret + CI source maps ([DEPLOY.md](DEPLOY.md#3a-sentry-optional-worker-errors)):
  ```bash
  npx wrangler secret put SENTRY_DSN   # if not already set on production
  ```
  GitHub (deploy job): `SENTRY_AUTH_TOKEN` secret; `SENTRY_ORG` + `SENTRY_PROJECT` repo variables. In Sentry: alert on **new issues** or error-rate spike for this project.
- [ ] **Optional** — Cloudflare **Notifications** on the account: Worker script errors / elevated 5xx (dashboard → Notifications)

**Chris verify Sentry is live:** trigger a test error in staging _or_ confirm issues appear in Sentry after deploy; if DSN unset, Worker errors only appear in Cloudflare Observability.

Legacy hosting decommission: see [Current truth](#current-truth-2026-09-26).

## Rollback

| Trigger | Action |
| --- | --- |
| Critical regression on new host | Redeploy previous Worker version (`wrangler rollback` or redeploy prior `main` SHA); **do not** remove new host DNS |
| Legacy redirect wrong | Adjust Redirect Rules on **legacy zone** only |
| Bad D1 migration | _TBD_ — restore from D1 backup / point-in-time if available (Chris) |

Document RTO/RPO: _TBD_ (Chris).

## Post-cutover

- [ ] Monitor Workers analytics / errors — use [§6 setup checklist](#6-post-cutover-monitoring) (watch window active from 2026-09-26)
- [x] Decommission legacy hosting — see [Current truth](#current-truth-2026-09-26)
- [x] Track phase status in [PROGRESS.md](PROGRESS.md)

## References

- [HLD.md](HLD.md) — delivery, auth, storage
- [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover) — task list (T6–T7)
- [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md) — bulk import checklist
- [SMOKE.md](SMOKE.md) — verification checklist
- [DEPLOY.md](DEPLOY.md) — secrets, CORS, Access
