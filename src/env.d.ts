/**
 * Augment Worker env with R2 S3 API secrets (not wrangler bindings).
 * Bindings + Access vars come from `npm run generate-types` / wrangler.jsonc.
 * Access env via `import { env } from 'cloudflare:workers'`.
 *
 * Set secrets via `.dev.vars` locally or `npx wrangler secret put <NAME>` in prod:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * Optional observability (Worker no-op when unset):
 *   SENTRY_DSN, SENTRY_RELEASE
 */
declare global {
  namespace Cloudflare {
    interface Env {
      R2_ACCOUNT_ID?: string;
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
      SENTRY_DSN?: string;
      SENTRY_RELEASE?: string;
    }
  }

  interface Env {
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    SENTRY_DSN?: string;
    SENTRY_RELEASE?: string;
  }
}

export {};
