import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { AppEnv } from '../lib/env.ts';

/** Public health/smoke endpoint — Phase 0 + data-layer wiring. */
export const GET: APIRoute = async () => {
	const app = AppEnv.from(env);

	const bindings = {
		db: Boolean(env.DB),
		portfolio: Boolean(env.PORTFOLIO),
		review: Boolean(env.REVIEW),
		images: Boolean(env.IMAGES),
	};

	return Response.json({
		ok: true,
		service: 'lawson-photography',
		phase: 0,
		bindings,
		daos: {
			d1: Boolean(app.d1),
			images: Boolean(app.images),
		},
	});
};
