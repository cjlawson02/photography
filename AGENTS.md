# AGENTS.md

README for coding agents. Complements [README.md](README.md) (humans) — do not duplicate it.

User chat instructions override this file. Closest `AGENTS.md` wins if nested later.

## Project overview

Photography website for Chris Lawson. Details live in docs; start from the pointer map below.

## Build and test commands

_TBD — add exact, copy-pasteable commands only after they exist in the repo._

## Code style guidelines

_TBD — only rules that differ from language/tool defaults._

## Testing instructions

_TBD_

## Security considerations

_TBD — secrets handling, files never to commit or modify._

## Commit and PR guidelines

_TBD_

## Documentation

- Prefer Mermaid for diagrams; one diagram per topic, in its canonical doc only.
- Leave unknowns as `_TBD_`. Do not invent product, stack, or schedule details.
- Keep docs lean. Link; do not restate.

### DRY — do not mirror or duplicate

- One source of truth per fact, diagram, estimate, or decision.
- Link or reference; never copy the same content into another file.
- If two docs need the same information, put it in one place and point the other at it.
- When updating shared information, edit only the canonical location.

### Pointer map

| Need | Read |
| --- | --- |
| Human overview / doc index | [README.md](README.md) |
| Architecture / design | [docs/HLD.md](docs/HLD.md) |
| Implementation plan | [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) |
| Estimates | [docs/LOE.md](docs/LOE.md) |
| Status, Gantt schedule, changelog | [docs/PROGRESS.md](docs/PROGRESS.md) |
| Agent instructions | This file |

Treat this file as living documentation: prune stale rules and fill `_TBD_` sections when decided.
