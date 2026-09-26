# Cutover runbook (Phase 5)

Move production traffic from the legacy WordPress site to the Workers deployment. Architecture and delivery constraints live in [HLD.md](HLD.md); phase checklist in [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover).

**Status:** in progress — custom domain and legacy 301 are live for the new host; **T7 bulk migration** remains; **T6 cutover sequence** (promote, production smoke, monitoring) runs **only after migration** (see [Sequencing](#sequencing)).

## Sequencing

**Chris (2026-09-26):** Phase 5 **cutover** steps in [Cutover sequence (after migration)](#cutover-sequence-after-migration) run **only after** [T7 bulk migration](#content-and-asset-migration-t7) is complete and signed off. Do not treat remote promote + production smoke as the formal cutover gate until imported content is on production.

**Already in place (does not complete cutover):** Workers custom domain on `photography.chrislawson.dev` and legacy zone **301** to the new host — useful for admin ingest and testing; not a substitute for migration + post-migration cutover.

Order: **T7 migration** → **T6 cutover sequence** → post-cutover monitoring / legacy decommission (_TBD_).

## Current truth (2026-09-26)

| Item | Status |
| --- | --- |
| Workers production host `https://photography.chrislawson.dev` | **Live** — custom domain + SSL on Workers ([DEPLOY.md](DEPLOY.md)) |
| Legacy public site `lawsonphotography.me` (+ `www`) | **301** → `https://photography.chrislawson.dev` via Cloudflare **Redirect Rules** on the **legacy zone** (not Worker middleware) |
| Admin Access on `/admin*` | Configured per [DEPLOY.md](DEPLOY.md) — **re-verify** after any Access or DNS change |
| Remote D1 migrations on production | **Pending** — apply when schema changes are ready (see [Deploy sequence](#deploy-sequence)) |
| Bulk legacy WordPress → D1/R2 import | **Scaffold only** — [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md), `npm run migrate:legacy:portfolio` |
| Automated production smoke | Manual — [SMOKE.md](SMOKE.md) |

## Chris input needed

Decisions required before finishing T7 bulk migration (do not guess):

1. **Legacy export format and path** — WordPress XML, media tarball, existing R2 bucket prefix, or other; set `LEGACY_EXPORT_ROOT` for the import script.
2. **Metadata mapping** — which WP fields map to portfolio `alt` / `title` / `caption` / `category` / `sortOrder`.
3. **Review / Picu content** — whether any legacy client galleries must become `/review/{slug}` collections (separate from portfolio import).
4. **URL redirect map** — whether any legacy permalinks need path-specific redirects beyond the zone 301 (table _TBD_).
5. **RTO/RPO and rollback owner** — who flips DNS/redirects and whether Workers rollback (`wrangler rollback` / redeploy prior SHA) is in scope.

## Preconditions

- [x] Production Cloudflare resources wired in [DEPLOY.md](DEPLOY.md) (D1 id, R2 buckets, Access vars, secrets inventory documented)
- [ ] CI/CD green on `main` ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)) immediately before promote
- [ ] Manual smoke pass on production host — [SMOKE.md](SMOKE.md)
- [ ] Remote D1 journal matches repo (`npx wrangler d1 migrations list photography --remote`)

## DNS and domain

**Workers production host:** `https://photography.chrislawson.dev`  
**Legacy public site:** [lawsonphotography.me](https://www.lawsonphotography.me/) — visitors receive **301** to the new host.

| Step | Owner | Notes |
| --- | --- | --- |
| Workers custom domain + SSL for `photography.chrislawson.dev` | **Done** | Live on Workers (Chris, 2026-09-26) |
| Access application covers `/admin*` on `photography.chrislawson.dev` | Verify | Self-hosted Public DNS app; path `/admin*` ([DEPLOY.md](DEPLOY.md#2-cloudflare-access-admin)) |
| **301 redirect** `lawsonphotography.me` (+ `www`) → `photography.chrislawson.dev` | **Done** | Redirect Rules on legacy zone; preserve path/query per rule config |
| Lower TTL on legacy DNS | _Optional_ | Already redirected; note if origin DNS changes again |

WordPress-specific paths may still need a small redirect map — see [Chris input needed](#chris-input-needed).

## Content and asset migration (T7)

Bulk migration scaffolding: [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md). **Blocks** [cutover sequence](#cutover-sequence-after-migration). Until import completes, new portfolio work uses admin ingest on the Workers host.

| Item | Status |
| --- | --- |
| Portfolio photos + metadata | _TBD_ — `scripts/legacy-portfolio-import.mjs` (dry-run default) |
| Review collections (legacy Picu) | _TBD_ |
| Redirect map (legacy URLs → new routes) | _TBD_ beyond zone 301 |

## Cutover sequence (after migration)

**Prerequisite:** T7 bulk import finished and verified per [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md) (including production smoke on imported content where applicable).

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

Run [SMOKE.md](SMOKE.md) against `https://photography.chrislawson.dev`:

- Public home, gallery lightbox (caption/title when set), `/media/portfolio` variants
- Admin `/admin` with Access JWT path
- Review `/review/{slug}` if collections exist

### 5. Legacy traffic

- [x] Zone **301** from `lawsonphotography.me` → new host (done early)
- [ ] Spot-check deep links, query strings, and `/review/{slug}` on the new host **after migration** (not legacy Picu paths)

### 6. Post-cutover monitoring

- Workers analytics / Sentry (if `SENTRY_DSN` set) — watch error rate for 24–48h after promote
- [ ] Decommission legacy hosting — _TBD_ timeline

## Rollback

| Trigger | Action |
| --- | --- |
| Critical regression on new host | Redeploy previous Worker version (`wrangler rollback` or redeploy prior `main` SHA); **do not** remove new host DNS |
| Legacy redirect wrong | Adjust Redirect Rules on **legacy zone** only |
| Bad D1 migration | _TBD_ — restore from D1 backup / point-in-time if available (Chris) |

Document RTO/RPO: _TBD_ (Chris).

## Post-cutover

- [ ] Monitor Workers analytics / errors — thresholds _TBD_
- [ ] Decommission legacy hosting — _TBD_
- [x] Track phase status in [PROGRESS.md](PROGRESS.md)

## References

- [HLD.md](HLD.md) — delivery, auth, storage
- [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover) — task list (T6–T7)
- [migration/legacy-bulk-import.md](migration/legacy-bulk-import.md) — bulk import checklist
- [SMOKE.md](SMOKE.md) — verification checklist
- [DEPLOY.md](DEPLOY.md) — secrets, CORS, Access
