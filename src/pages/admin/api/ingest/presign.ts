import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonOk, parseJsonBody, requireAdmin } from '../../../../lib/admin/http.ts';
import { accessEnvFrom } from '../../../../lib/cloudflare-env.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { ensureAppError, toErrorResponse } from '../../../../lib/http/app-error.ts';
import { presignBodySchema } from '../../../../lib/ingest/schemas.ts';
import { IngestService } from '../../../../lib/services/ingest-service.ts';

/**
 * Mint a presigned PUT URL into PORTFOLIO or REVIEW and insert a pending D1 row.
 * Review requires `collectionId` (existing ReviewCollections row).
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, accessEnvFrom(env));
	if (auth instanceof Response) return auth;

	try {
		const body = await parseJsonBody(request, presignBodySchema);
		const result = await ensureAppError(async () =>
			IngestService.from(AppEnv.from(env)).createPresign(body),
		);
		return jsonOk(result);
	} catch (error) {
		return toErrorResponse(error);
	}
};
