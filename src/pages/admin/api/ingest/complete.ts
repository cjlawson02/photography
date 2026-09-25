import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, parseJsonBody, requireAdmin } from '../../../../lib/admin/http.ts';
import { accessEnvFrom } from '../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { ensureAppError, toErrorResponse } from '../../../../lib/http/app-error.ts';
import { completeBodySchema } from '../../../../lib/ingest/schemas.ts';
import { IngestService } from '../../../../lib/services/ingest-service.ts';

/**
 * v1 completion callback after browser PUT to R2.
 * Images Free compress-once → put variant bytes → mark D1 ready/failed.
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const body = await parseJsonBody(request, completeBodySchema);
		const result = await ensureAppError(async () =>
			IngestService.from(AppEnv.from(env)).completeIngest(body),
		);
		return jsonOk(result);
	} catch (error) {
		return toErrorResponse(error);
	}
};
