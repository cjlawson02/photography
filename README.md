# Chris Lawson Photography

Photography website for Chris Lawson — Astro hybrid SSR on Cloudflare Workers.

## Documentation

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Agent working guide (commands, pointers) |
| [docs/HLD.md](docs/HLD.md) | High-level design (Mermaid) |
| [docs/ADMIN-UX.md](docs/ADMIN-UX.md) | Admin workflows and interaction patterns (v2) |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Public/admin React islands, hydration |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Implementation plan (Mermaid) |
| [docs/LOE.md](docs/LOE.md) | Estimates |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Status, Gantt schedule, & changelog |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Hostname, Access, secrets, R2 CORS, CI/CD, Sentry |
| [docs/SMOKE.md](docs/SMOKE.md) | Manual smoke checklist |
| [docs/CUTOVER.md](docs/CUTOVER.md) | Cutover runbook |

Diagrams use [Mermaid](https://mermaid.js.org/). One source of truth per topic — see AGENTS.md.

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars   # fill secrets locally; never commit
npm run dev
```

See [AGENTS.md](AGENTS.md) for build/typecheck/migrate/deploy commands. Secrets inventory: [`.dev.vars.example`](.dev.vars.example) and [docs/DEPLOY.md](docs/DEPLOY.md).
