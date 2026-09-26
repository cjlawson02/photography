# Cutover runbook (Phase 5)

Move production traffic from the legacy WordPress site to the Workers deployment. Architecture and delivery constraints live in [HLD.md](HLD.md); phase checklist in [IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover).

**Status:** skeleton — fill `_TBD_` sections with Chris before execution.

## Preconditions

- [ ] Production Cloudflare resources match [DEPLOY.md](DEPLOY.md) (D1, R2 buckets, Access on `/admin*`, secrets)
- [ ] CI/CD green on `main` ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml))
- [ ] Manual smoke pass complete — [SMOKE.md](SMOKE.md)

## DNS and domain

_Target host:_ `photography.chrislawson.dev` (see [DEPLOY.md](DEPLOY.md)).

| Step | Owner | Notes |
| --- | --- | --- |
| Confirm Workers custom domain + SSL | _TBD_ | |
| Lower TTL on legacy DNS records | _TBD_ | _TBD_ hours before switch |
| Point apex/www (or chosen hostnames) to Workers | _TBD_ | Record types and values _TBD_ |
| Verify Access application still covers `/admin*` on production host | _TBD_ | |

## Content and asset migration

Bulk migration from legacy WordPress/R2 is **deferred** to a separate effort ([IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover)).

| Item | Status |
| --- | --- |
| Portfolio photos + metadata | _TBD_ — script/out of band |
| Review collections (if any on legacy) | _TBD_ |
| Redirect map (legacy URLs → new routes) | _TBD_ |

Until migration completes, cutover may be **DNS-only** with content re-uploaded via admin ingest — _TBD_ (Chris).

## Cutover sequence (draft)

1. _TBD_ — freeze legacy content edits (if required)
2. _TBD_ — apply remote D1 migrations: `npx wrangler d1 migrations apply photography --remote`
3. _TBD_ — deploy: `npx wrangler deploy` (or CI promote)
4. _TBD_ — run [SMOKE.md](SMOKE.md) against production host
5. _TBD_ — switch DNS (see above)
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
