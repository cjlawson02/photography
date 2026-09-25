import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, requireAdmin } from '../../../../../lib/admin/http.ts';
import { accessEnvFrom } from '../../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../../lib/env.ts';
import { ensureAppError, toErrorResponse } from '../../../../../lib/http/app-error.ts';
import { PortfolioService } from '../../../../../lib/services/portfolio-service.ts';

/** List all portfolio photos (any ingest status) for admin UI. */
export const GET: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const photos = await ensureAppError(async () =>
			PortfolioService.from(AppEnv.from(env)).listForAdmin(),
		);
		return jsonOk({ photos });
	} catch (error) {
		return toErrorResponse(error);
	}
};
