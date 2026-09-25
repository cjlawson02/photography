import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, requireAdmin } from '../../../../../lib/admin/http.ts';
import { reviewCollectionDeleteQuerySchema } from '../../../../../lib/admin/review-collection-schemas.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { idSchema } from '../../../../../db/schema/types.ts';
import { AppEnv } from '../../../../../lib/env.ts';
import { AppError, ensureAppError, toErrorResponse } from '../../../../../lib/http/app-error.ts';
import { ReviewService } from '../../../../../lib/services/review-service.ts';

function collectionIdFromParams(params: { id?: string }): string {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) {
		throw new AppError('BAD_REQUEST', 'Invalid collection id');
	}
	return parsed.data;
}

/** Revoke a review link (delete collection + photos; optional R2 cleanup). */
export const DELETE: APIRoute = async ({ request, params, url }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const id = collectionIdFromParams(params);
		const query = reviewCollectionDeleteQuerySchema.parse(Object.fromEntries(url.searchParams));
		const collection = await ensureAppError(async () =>
			ReviewService.from(AppEnv.from(env)).revokeCollection(id, {
				cleanupR2: query.cleanupR2,
			}),
		);
		return jsonOk({ collection });
	} catch (error) {
		return toErrorResponse(error);
	}
};
