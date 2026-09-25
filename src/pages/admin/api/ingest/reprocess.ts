import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, parseJsonBody, requireAdmin } from '../../../../lib/admin/http.ts';
import { accessEnvFrom } from '../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { ensureAppError, toErrorResponse } from '../../../../lib/http/app-error.ts';
import { reprocessBodySchema } from '../../../../lib/ingest/schemas.ts';
import { IngestService } from '../../../../lib/services/ingest-service.ts';

/**
 * Reprocess variants from the stored original (failed → ready, or re-run).
 * No full status state machine in v1 (HLD).
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const body = await parseJsonBody(request, reprocessBodySchema);
		const result = await ensureAppError(async () =>
			IngestService.from(AppEnv.from(env)).reprocess(body),
		);
		return jsonOk(result);
	} catch (error) {
		return toErrorResponse(error);
	}
};
