# Legacy bulk import (Phase 5 / T7)

Checklist for moving portfolio content from the legacy WordPress site into Workers + D1 + R2.

**Portfolio production import:** **Done** (Chris, 2026-09-26) — **34** published posts (FooGallery/Picu excluded). Formal cutover steps: [CUTOVER.md § Cutover sequence (after migration)](../CUTOVER.md#cutover-sequence-after-migration).

## Source (confirmed)

| Item | Value |
| --- | --- |
| NAS | `172.16.1.2` (TrueNAS), SSH user `root`, key `~/.ssh/id_ed25519_nas` |
| WordPress tree | `/mnt/main/apps/lawsonphotography-wp` (active Docker stack) |
| Uploads | `/mnt/main/apps/lawsonphotography-wp/wp-content/uploads` |
| MariaDB | Host `172.16.1.2:3306`, database/user `lawsonphotography` (reachable from NAS host network only; CLI queries via SSH + `docker run --network host`) |
| Import set | **34** published gallery posts (featured image + `post_tag` → category; Front Page Slider → hero). **Skip** FooGallery, Picu, and NextGEN (`wp-content/gallery/*`) |

Older tree `/mnt/main/apps/lawsonphotography` is inactive; do not stage from it.

## Prerequisites

- [x] Legacy export location and format confirmed (live MariaDB + NAS uploads)
- [x] SSH key to NAS (`ssh -o BatchMode=yes 172.16.1.2`)
- [x] Production D1 schema current (remote journal matches repo)
- [x] R2 buckets exist; wipe + put use Wrangler OAuth (no R2 S3 keys required for migration scripts)
- [x] Dry-run reviewed (`npm run migrate:legacy:portfolio -- import --dry-run`)
- [x] Production import of 34 posts

## Environment

Copy secrets into **untracked** `.legacy-export/.env` (gitignored). Template names also listed in [`.dev.vars.example`](../../.dev.vars.example):

| Variable | Purpose |
| --- | --- |
| `WP_DB_HOST` / `WP_DB_PORT` / `WP_DB_NAME` / `WP_DB_USER` / `WP_DB_PASSWORD` | Live MariaDB |
| `WP_TABLE_PREFIX` | Default `wp_` |
| `LEGACY_SSH_HOST` | Default `172.16.1.2` |
| `LEGACY_NAS_SCP` | `root@172.16.1.2:/mnt/main/apps/lawsonphotography-wp/wp-content/uploads` |
| `LEGACY_EXPORT_ROOT` | Local staging (default `.legacy-export`) |
| `D1_TARGET` | `local` (default) or `remote` |
| `DRY_RUN` | Default dry-run unless `--execute` |

## Commands

```bash
npm run migrate:legacy:inventory          # MariaDB → .legacy-export/inventory.json
npm run migrate:legacy:stage -- --execute # rsync uploads → .legacy-export/uploads
npm run migrate:legacy:wipe -- --execute  # local portfolio D1 + R2
D1_TARGET=remote npm run migrate:legacy:wipe -- --execute  # remote wipe (destructive)
npm run migrate:legacy:portfolio -- import --dry-run
D1_TARGET=local npm run migrate:legacy:portfolio -- import --execute
D1_TARGET=remote npm run migrate:legacy:portfolio -- import --execute
```

Entry point: [`scripts/legacy-portfolio-import.mjs`](../../scripts/legacy-portfolio-import.mjs) → `scripts/legacy/*`.

## Metadata mapping

| WP | Portfolio |
| --- | --- |
| Featured image file | R2 `{id}/original` + sharp `gallery.webp` (1600) / `thumb.webp` (400) |
| `post_tag` ∈ Friends/Nature/Portraits/People/Beach | `category` (priority: Portraits → Friends → People → Beach → Nature) |
| Category **Front Page Slider** | `hero = true` |
| `post_title` / attachment title | `title` (refined after vision caption pass) |
| `post_excerpt` | `caption` (refined after vision caption pass) |
| `_wp_attachment_image_alt` | `alt` (refined after vision caption pass) |
| — | `published = true`, `status = ready` |

Idempotency: `.legacy-export/import-manifest.json` keyed by WP attachment id **per** `D1_TARGET`.

## Verify

- Local / remote: `SELECT COUNT(*) FROM PortfolioPhotos` — expect **34**; heroes **4**
- `npm run dev` — public home gallery + lightbox; admin `/admin/portfolio`
- Production: [SMOKE.md](../SMOKE.md) on `https://photography.chrislawson.dev` — home should list **34** `/media/portfolio/.../gallery.webp` URLs

## Out of scope

- Automated Picu → review collection migration
- NextGEN galleries under `wp-content/gallery/`
- FooGallery media-library dump (not homepage posts)
- WordPress permalink → new URL redirect map (beyond zone-level 301)
- Deleting legacy hosting
