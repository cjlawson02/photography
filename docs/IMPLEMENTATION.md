# Backlog

Open work after launch. Architecture: [HLD.md](HLD.md). Admin product decisions: [ADMIN-UX.md](ADMIN-UX.md). Deploy and rollback: [DEPLOY.md](DEPLOY.md).

Shipped: public portfolio, admin, client review (link secrecy), legacy portfolio import, production host `photography.chrislawson.dev`.

## Open

| ID | Item | Notes |
| --- | --- | --- |
| S8 | CSP nonces | Replace `'unsafe-inline'` (FIX-10) |
| S8 | Ingest E2E | Presigned PUT + CORS against live R2 (FIX-11) |
| R2 | Review password gate | Optional (FIX-06). Default remains link secrecy — [ADMIN-UX D6](ADMIN-UX.md#open-decisions) |
| R2 | Zone HSTS + Access | Confirm coverage (Q-01) |
| R2 | Review cache after revoke | Proof TTL / purge hygiene (Q-02) |
| — | Public IA beyond home | Extra public routes; page inventory still open — [HLD open questions](HLD.md#open-questions) |
| — | Picu / review import | Only if needed later — [legacy bulk import](migration/legacy-bulk-import.md) |

Product decisions that are not engineering tasks (download-all, retention, client notify, upload tray) stay in [ADMIN-UX open decisions](ADMIN-UX.md#open-decisions).
