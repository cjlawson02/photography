import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { bindingHealth } from '../lib/env.ts';

/** Public health/smoke — bindings only (no R2 S3 secrets / AppEnv ingest parse). */
export const GET: APIRoute = async () => {
  const snapshot = bindingHealth(env);

  return Response.json({
    ok: true,
    service: 'lawson-photography',
    phase: 0,
    ...snapshot,
  });
};
