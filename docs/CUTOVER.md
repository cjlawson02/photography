# Cutover runbook (Phase 5)

Move production traffic from the legacy WordPress site to the Workers deployment. Architecture and delivery constraints live in [HLD.md](HLD.md); phase checklist in [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover).

**Status:** skeleton — fill `_TBD_` sections with Chris before execution.

## Preconditions

- [ ] Production Cloudflare resources match [DEPLOY.md](DEPLOY.md) (D1, R2 buckets, Access on `/admin*`, secrets)
- [ ] CI/CD green on `main` ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml))
- [ ] Manual smoke pass complete — [SMOKE.md](SMOKE.md)

## DNS and domain

**Workers production host:** `https://photography.chrislawson.dev` (see [DEPLOY.md](DEPLOY.md)).  
**Legacy public site (Phase 5):** [lawsonphotography.me](https://www.lawsonphotography.me/) — traffic cutover _TBD_.

| Step | Owner | Notes |
| --- | --- | --- |
| Workers custom domain + SSL for `photography.chrislawson.dev` | Done | Live on Workers (Chris, 2026-09-26) |
| Access application covers `/admin*` on `photography.chrislawson.dev` | _TBD_ | Re-verify after DNS or Access changes |
| Lower TTL on **legacy** DNS (`lawsonphotography.me`) | _TBD_ | Before pointing legacy host at Workers or redirects |
| Route **apex + www** (`lawsonphotography.me`, `www.lawsonphotography.me`) to this Worker | Chris / Cloudflare | **DNS prerequisite:** custom domains in `wrangler.jsonc` (same pattern as `photography.chrislawson.dev` in [DEPLOY.md](DEPLOY.md)); zone must be on the Cloudflare account so SSL + records provision on deploy |
| **301 redirect** `lawsonphotography.me` (+ `www`) → `photography.chrislawson.dev` | Deployed in Worker | `src/middleware.ts` + `src/lib/http/legacy-redirect.ts` — path and query preserved. Alternative: Redirect Rules on the legacy zone if legacy traffic must not hit this script |

## Content and asset migration

Bulk migration from legacy WordPress/R2 is **deferred** to a separate effort ([IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover)).

| Item | Status |
| --- | --- |
| Portfolio photos + metadata | _TBD_ — script/out of band |
| Review collections (if any on legacy) | _TBD_ |
| Redirect map (legacy URLs → new routes) | _TBD_ |

Until migration completes, new portfolio work uses admin ingest on the Workers host; bulk legacy import remains _TBD_.

### Legacy 301 (Worker)

When ready to retire the WordPress site publicly:

1. Ensure `photography.chrislawson.dev` passes [SMOKE.md](SMOKE.md).
2. **DNS:** lower TTL on the legacy zone, then deploy so `lawsonphotography.me` and `www.lawsonphotography.me` are Workers custom domains on this script (see table above).
3. Deploy `main` (or promote CI) — middleware issues **301** to `https://photography.chrislawson.dev` with the same path and query string.
4. Spot-check home, deep links, and that review URLs on the new host still use `/review/{slug}` (not legacy Picu paths).

**Alternative (no Worker on legacy host):** Cloudflare **lawsonphotography.me** zone → **Rules → Redirect Rules** — match apex + `www` → **301** to `https://photography.chrislawson.dev/${uri.path}` with query passthrough.

WordPress-specific URLs may need a small redirect map table later — _TBD_.

## Cutover sequence (draft)

1. _TBD_ — freeze legacy content edits (if required)
2. _TBD_ — apply remote D1 migrations: `npx wrangler d1 migrations apply photography --remote`
3. _TBD_ — deploy: `npx wrangler deploy` (or CI promote)
4. _TBD_ — run [SMOKE.md](SMOKE.md) against production host
5. _TBD_ — point legacy DNS at this Worker and deploy **301** middleware (see above); new host already live
6. _TBD_ — post-cutover smoke + spot-check public home, media URLs, admin ingest

## Rollback

| Trigger | Action |
| --- | --- |
| _TBD_ | Revert DNS to legacy origin _TBD_ |
| _TBD_ | _TBD_ — whether to roll back Workers version (`wrangler rollback` / redeploy prior tag) |
| _TBD_ | Communicate client review link breakage if DNS rolled back mid-session |

Document RTO/RPO targets: _TBD_ (Chris).

## Post-cutover

- [ ] Monitor Workers analytics / errors — _TBD_ thresholds
- [ ] Decommission legacy hosting — _TBD_ timeline
- [ ] Update [PROGRESS.md](PROGRESS.md) phase status

## References

- [HLD.md](HLD.md) — delivery, auth, storage
- [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover) — task list
- [SMOKE.md](SMOKE.md) — verification checklist
- [DEPLOY.md](DEPLOY.md) — secrets, CORS, Access
