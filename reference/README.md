# Reference assets (not deployed)

Files under `reference/` are **reference only**. They are **not** imported by the Astro production bundle or Workers deploy.

## Purpose

Support Phase 3 public UI work by preserving the live WordPress look-and-feel without shipping PHP or theme CSS to production. UX goals for the Astro app are in [docs/HLD.md](../docs/HLD.md) (match live site UX DNA: carousel, filters, lightbox, sticky header, familiar palette).

## WordPress theme snapshot

Fetched from [lawsonphotography.me](https://www.lawsonphotography.me/) (2026-09-25):

| File | Source |
| --- | --- |
| `wordpress/photograph/style.css` | Parent theme **Photograph** (Theme Freesia) |
| `wordpress/photograph-child/style.css` | Active child theme (`Template: photograph`) |
| `wordpress/custom.css` | Chris’s Additional CSS from WP Customizer (exact copy) |

Design tokens extracted into `src/styles/global.css` use the **parent** typography (Roboto Condensed body, Rajdhani headings), **Customizer accent** `#81d742` (inline theme CSS on the live homepage), and **custom.css** grays `#3b3b3b` / `#2b2b2b` with white foreground on content.

**Roboto** in `custom.css` applies to the Instagram feed block (`.sbi_header_text h3`) only; the Astro app does not set Roboto as a global font unless a future feed component needs it.

## License

The Photograph parent/child `style.css` headers state **GPL v3** (Theme Freesia). They are stored here for **reference and token extraction** while rebuilding on Astro; do not redistribute as a standalone theme product. The deployed site’s custom CSS is site-specific configuration.
