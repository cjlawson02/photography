import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { accessDeniedResponse, verifyAccessJwt } from '../../../lib/access/verify-jwt.ts';
import { AppEnv } from '../../../lib/env.ts';

/**
 * Admin smoke mutation path under `/admin/api/*`.
 * Verifies Access JWT (defense in depth). Real admin mutations land here in later phases.
 */
export const GET: APIRoute = async ({ request }) => {
	try {
		const identity = await verifyAccessJwt(request, {
			CF_ACCESS_TEAM_DOMAIN: env.CF_ACCESS_TEAM_DOMAIN,
			CF_ACCESS_AUD: env.CF_ACCESS_AUD,
		});
		const app = AppEnv.from(env);
		return Response.json({
			ok: true,
			admin: true,
			email: identity.email ?? null,
			bindings: {
				db: Boolean(env.DB),
				portfolio: Boolean(env.PORTFOLIO),
				review: Boolean(env.REVIEW),
				images: Boolean(env.IMAGES),
			},
			daos: {
				d1: Boolean(app.d1),
				images: Boolean(app.images),
			},
		});
	} catch (error) {
		return accessDeniedResponse(error);
	}
};
