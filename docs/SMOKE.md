# Smoke tests (manual)

Run after deploy or before cutover. Production host: `https://photography.chrislawson.dev` ([DEPLOY.md](DEPLOY.md)).

## Public portfolio

- [ ] `GET /health` — JSON with bindings (no R2 S3 secrets required)
- [ ] Home loads: hero carousel (if hero photos published), masonry gallery, category filter, PhotoSwipe lightbox on grid images
- [ ] `GET /media/portfolio/{id}/gallery.webp` for a published photo — `200`, long cache headers
- [ ] Page `<title>`, meta description, canonical, and Open Graph tags on home

## Admin (Cloudflare Access)

- [ ] `/admin` redirects to Access login when unauthenticated
- [ ] After login: `/admin/api/health` returns OK with JWT
- [ ] Upload: presign → PUT → complete; photo reaches `ready` on portfolio admin
- [ ] Portfolio admin: publish, category, sort, hero; changes appear on public home when published
- [ ] Failed ingest: row shows `failed`; **Reprocess** on portfolio admin recovers when original exists in R2
- [ ] Review: create collection, upload with `collectionId`, open `/review/{slug}`, select/approve

## Client review

- [ ] Review pages emit `noindex`; `robots.txt` disallows `/review`
- [ ] `GET /media/review/{id}/gallery.webp` for a ready review photo

## Not covered here

- Legacy content migration ([IMPLEMENTATION.md](IMPLEMENTATION.md#phase-5--cutover))
- D1 remote migrations (`wrangler d1 migrations apply photography --remote`)
