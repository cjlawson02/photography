import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/** Public health/smoke endpoint — Phase 0 only. */
export const GET: APIRoute = async () => {
	const bindings = {
		db: Boolean(env.DB),
		portfolio: Boolean(env.PORTFOLIO),
		review: Boolean(env.REVIEW),
		images: Boolean(env.IMAGES),
	};

	return Response.json({
		ok: true,
		service: 'lawson-photography',
		phase: 1,
		bindings,
	});
};
