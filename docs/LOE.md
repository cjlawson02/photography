# Level of Effort

Rough phase/task sizing for [IMPLEMENTATION.md](IMPLEMENTATION.md). Architecture and product decisions stay in [HLD.md](HLD.md). Schedule status: [PROGRESS.md](PROGRESS.md).

These are order-of-magnitude sizes only — not calendar commitments, and not a second architecture decision table.

## Summary

| Phase | Relative size | Confidence |
| --- | --- | --- |
| [0 — Foundation](IMPLEMENTATION.md#phase-0--foundation) | M–L | Medium–high — stack and bindings locked in HLD; brand polish deferred |
| [1 — Ingest](IMPLEMENTATION.md#phase-1--ingest) | L | Medium — Images Free + CORS/presign integration risk; columns/variants `_TBD_` |
| [2 — Admin](IMPLEMENTATION.md#phase-2--admin) | M–L | Medium — Access/JWT and mutation mount locked; portfolio field set `_TBD_` |
| [3 — Public site](IMPLEMENTATION.md#phase-3--public-site) | M–L | Medium — Worker `/media/portfolio/...` locked; page IA and brand polish `_TBD_` |
| [4 — Client review](IMPLEMENTATION.md#phase-4--client-review-phase-1) | M–L | Medium–high — path, secrecy, and `/media/review/...` locked; schema/TTL `_TBD_` |
| [5 — Cutover](IMPLEMENTATION.md#phase-5--cutover) | _TBD_ (smoke tests ~M once plan exists) | Low — migration source, DNS, rollback `_TBD_` |

**Size legend (relative, not hours):** S ≪ M ≪ L ≪ XL. Prefer the left column above over inventing day counts.

**Overall rebuild (phases 0–4, excluding cutover unknowns):** roughly **L–XL** in aggregate. Bands stay wide until remaining HLD `_TBD_`s (columns, variant set, IA, brand, cutover) land. Phase 5 stays `_TBD_` until legacy source and cutover runbook exist.

## Estimates by phase

Task rows map 1:1 to [IMPLEMENTATION.md](IMPLEMENTATION.md) checklists. Widen a row when HLD still owns the open detail.

### Phase 0 — Foundation

| Task | Size | Notes |
| --- | --- | --- |
| Astro hybrid SSR + `wrangler.jsonc` Workers path | M | Locked stack; smoke/health only |
| D1 + Drizzle; flat migrations; empty portfolio vs review modules | S–M | Column detail deferred |
| Bind private R2 `PORTFOLIO` + `REVIEW` | S | Binding wiring |
| R2 S3 API secrets/CORS for browser PUT | S–M | Config risk; needed before Phase 1 smoke |
| Tailwind + CSS design tokens | S (stub) / _TBD_ (polish) | Visual system polish `_TBD_` |
| Place admin mutations under `/admin/api/trpc` | S–M | Access prefix coverage (not Astro Actions) |
| Access on `/admin*` + shared JWT verify helper | M | Every `/admin/*` mutation verifies JWT |
| Env/secrets inventory | S / _TBD_ list | Document as decided |

### Phase 1 — Ingest

| Task | Size | Notes |
| --- | --- | --- |
| `/admin/*` mint presigned PUT URLs (JWT; either bucket) | M | |
| Browser upload client (PUT → complete callback) | M | v1 default per HLD |
| Ingest complete: Images Free compress-once → variant bytes | M–L | Highest integration uncertainty in this phase |
| D1 portfolio metadata writes | S–M | Exact columns `_TBD_` in HLD |
| Reprocess from original (failed → ready) | S–M | No full state machine in v1 |
| Failure/retry for incomplete PUT or compress | _TBD_ | Behavior details open |

### Phase 2 — Admin

| Task | Size | Notes |
| --- | --- | --- |
| Admin shell/layout behind Access | M | |
| Portfolio CRUD/list/publish/hero/sort | M–L | Fields `_TBD_` — band widens until decided |
| Trigger/monitor ingest + reprocess | S–M | |
| Review-collection create/list/revoke + attach uploads | S–M | Usable once Phase 4 media path exists |
| Confirm no admin mutations outside `/admin/*` | S | Audit / deny-by-default check |

### Phase 3 — Public site

| Task | Size | Notes |
| --- | --- | --- |
| Public routes (hero, filters, lightbox) | M / _TBD_ IA depth | UX DNA locked; page inventory `_TBD_` |
| Published-only portfolio D1 queries | S–M | |
| Worker `/media/portfolio/{id}/{variant}` + cache | M | Delivery strategy locked in HLD |
| SEO basics; keep review URLs out of indexes | S | Complements Phase 4 `noindex` |
| Responsive layout via Phase 0 tokens | M / _TBD_ polish | Brand direction `_TBD_` |

### Phase 4 — Client review (phase 1)

| Task | Size | Notes |
| --- | --- | --- |
| Review table domain (collections/photos/selections) | S–M | Schema details `_TBD_` in HLD |
| Create/revoke review links from `/admin/*` | S–M | |
| Public `/review/{slug}` + select/approve | M | Link-secrecy only; no password gate in v1 |
| Worker `/media/review/{id}/{variant}` from `REVIEW` | S–M | Path locked in HLD |
| `noindex` + robots for review surfaces | S | |
| Purge CDN and/or shorter TTL on delete | S–M | Default TTL `_TBD_` |
| Document future password-gate extension point | S | Docs only |

### Phase 5 — Cutover

| Task | Size | Notes |
| --- | --- | --- |
| Content/asset migration plan | _TBD_ | Legacy source unknown |
| DNS / custom domain / Access production checklist | _TBD_ | |
| Smoke tests (portfolio, Access, ingest, review, purge) | M | Once earlier phases exist |
| Rollback notes | _TBD_ | |

## Assumptions

- Locked stack and product constraints are owned by [HLD.md](HLD.md). Do not restate them here.
- Phase sequencing and task lists are owned by [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Estimates assume one builder familiar with Workers/Astro; integration spikes (presign CORS, Images Free) may push Phase 0–1 toward the high end of the band.
- Brand/UI polish is out of band until visual direction lands; Phase 0 can ship stub tokens.
- Scaffolding Phase 0 does **not** wait on remaining column/IA/cutover `_TBD_`s.

## Open questions

Sizing tightens when the open questions in [IMPLEMENTATION.md](IMPLEMENTATION.md#open-questions) / [HLD.md](HLD.md#open-questions) land — especially exact columns, ingest variant set, public IA depth, review TTL, legacy cutover source, and brand tokens. Delivery routes and admin auth are no longer sizing unknowns.
