import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle kit for D1.
 *
 * - `npm run db:generate` — schema → SQL under `src/db/migrations` (no CF credentials).
 * - Apply with `npm run db:migrate:local` / `wrangler d1 migrations apply photography --remote`.
 *
 * Optional d1-http introspect/push (not required for v1 generate→wrangler apply):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_TOKEN   (API token with D1 edit; do not commit)
 *
 * Known D1: name `photography`, id `4f01bd2c-355d-4501-914d-7cb9cf68a70c`
 */
export default defineConfig({
  schema: './src/db/schema/kit.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
});
