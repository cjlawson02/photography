import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, parseJsonBody, requireAdmin } from '../../../../lib/admin/http.ts';
import { reviewCollectionCreateBodySchema } from '../../../../lib/admin/review-collection-schemas.ts';
import { accessEnvFrom } from '../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { AppError, ensureAppError, toErrorResponse } from '../../../../lib/http/app-error.ts';

/**
 * List review collections (newest first) for admin UI and ingest picker.
 */
export const GET: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const collections = await ensureAppError(async () =>
			AppEnv.from(env).d1.reviewCollections.listRecent(),
		);
		return jsonOk({ collections });
	} catch (error) {
		return toErrorResponse(error);
	}
};

/**
 * Create a review collection (slug unique). Public page at `/review/{slug}`.
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const body = await parseJsonBody(request, reviewCollectionCreateBodySchema);
		const row = await ensureAppError(async () => {
			const dao = AppEnv.from(env).d1.reviewCollections;
			const existing = await dao.getBySlug(body.slug);
			if (existing) {
				throw new AppError('BAD_REQUEST', 'Slug already in use');
			}
			return dao.insert(body);
		});
		return jsonOk({ collection: row }, { status: 201 });
	} catch (error) {
		return toErrorResponse(error);
	}
};
