import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import {
	jsonOk,
	parseJsonBody,
	requireAdmin,
} from '../../../../../lib/admin/http.ts';
import {
	portfolioPhotoAdminUpdateBodySchema,
	portfolioPhotoDeleteQuerySchema,
} from '../../../../../lib/admin/portfolio-schemas.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../../lib/env.ts';
import { AppError, ensureAppError, toErrorResponse } from '../../../../../lib/http/app-error.ts';
import { idSchema } from '../../../../../db/schema/types.ts';
import { PortfolioService } from '../../../../../lib/services/portfolio-service.ts';

function photoIdFromParams(params: { id?: string }): string {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) {
		throw new AppError('BAD_REQUEST', 'Invalid photo id');
	}
	return parsed.data;
}

/** Update publish/category/sort/hero metadata. */
export const PATCH: APIRoute = async ({ request, params }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const id = photoIdFromParams(params);
		const body = await parseJsonBody(request, portfolioPhotoAdminUpdateBodySchema);
		const photo = await ensureAppError(async () =>
			PortfolioService.from(AppEnv.from(env)).updateMetadata(id, body),
		);
		return jsonOk({ photo });
	} catch (error) {
		return toErrorResponse(error);
	}
};

/** Delete D1 row; optional R2 object cleanup (default on). */
export const DELETE: APIRoute = async ({ request, params, url }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const id = photoIdFromParams(params);
		const query = portfolioPhotoDeleteQuerySchema.parse(Object.fromEntries(url.searchParams));
		const photo = await ensureAppError(async () =>
			PortfolioService.from(AppEnv.from(env)).deletePhoto(id, {
				cleanupR2: query.cleanupR2,
			}),
		);
		return jsonOk({ photo });
	} catch (error) {
		return toErrorResponse(error);
	}
};
