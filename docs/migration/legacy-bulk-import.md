# Legacy bulk import (Phase 5 / T7)

Checklist for moving portfolio content from the legacy WordPress site into Workers + D1 + R2.

**Portfolio production import:** **Done** (Chris, 2026-09-26). Formal cutover steps: [CUTOVER.md § Cutover sequence (after migration)](../CUTOVER.md#cutover-sequence-after-migration).

## Prerequisites

- [x] Legacy export location and format confirmed — portfolio import complete
- [ ] Production D1 schema current: `npx wrangler d1 migrations apply photography --remote` (after review)
- [ ] R2 buckets `photography-portfolio` / `photography-review` exist; CORS applied (`npm run r2:cors:apply`)
- [ ] R2 S3 API secrets set for any script that presigns or uses S3 PUT
- [ ] Dry-run reviewed on a copy of export data

## Recommended flow

1. **Inventory** — count images, categories, and metadata fields in the legacy export; note Picu/review URLs if any must become `/review/{slug}` collections.
2. **Dry-run** — `npm run migrate:legacy:portfolio -- --dry-run` (see [scripts/legacy-portfolio-import.mjs](../../scripts/legacy-portfolio-import.mjs)).
3. **Staging import** — _TBD_ (local D1 + local/miniflare R2, or dedicated staging bucket prefix).
4. **Production import** — **Done** (Chris, 2026-09-26).
5. **Verify** — [SMOKE.md](../SMOKE.md) on `https://photography.chrislawson.dev` as part of [T6 cutover](../CUTOVER.md#cutover-sequence-after-migration); spot-check alt/title/caption in admin and public lightbox.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `LEGACY_EXPORT_ROOT` | Yes (for real runs) | Directory containing legacy export (layout _TBD_) |
| `DRY_RUN` | Default `true` | When `true` or `--dry-run`, no D1/R2 writes |

Additional vars for a full importer (_TBD_): WordPress XML path, R2 credentials, D1 HTTP token — see CUTOVER.md.

## Out of scope (until specified)

- Automated Picu → review collection migration
- WordPress permalink → new URL redirect map (beyond zone-level 301)
- Deleting legacy hosting
