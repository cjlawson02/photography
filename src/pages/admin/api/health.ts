import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from '../../../lib/access/verify-jwt.ts';
import { accessEnvFrom } from '../../../lib/cloudflare-env.ts';
import { bindingHealth } from '../../../lib/env.ts';

/**
 * Admin smoke mutation path under `/admin/api/*`.
 * Verifies Access JWT (defense in depth). Does not require R2 S3 secrets.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const identity = await verifyAccessJwt(request, accessEnvFrom(env));
    const snapshot = bindingHealth(env);
    return Response.json({
      ok: true,
      admin: true,
      email: identity.email ?? null,
      ...snapshot,
    });
  } catch (error) {
    return accessDeniedResponse(error);
  }
};
