import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { IngestProcessError, processPhotoIngest } from '../../../../lib/ingest/process.ts';
import { formatZodError, reprocessBodySchema } from '../../../../lib/ingest/schemas.ts';

/**
 * Reprocess variants from the stored original (failed → ready, or re-run).
 * No full status state machine in v1 (HLD).
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, {
		CF_ACCESS_TEAM_DOMAIN: env.CF_ACCESS_TEAM_DOMAIN,
		CF_ACCESS_AUD: env.CF_ACCESS_AUD,
	});
	if (auth instanceof Response) return auth;

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return jsonError('Invalid JSON body', 400);
	}

	const parsed = reprocessBodySchema.safeParse(raw);
	if (!parsed.success) {
		return jsonError(formatZodError(parsed.error), 400);
	}
	const { id, bucket } = parsed.data;

	const app = AppEnv.from(env);
	const photo =
		bucket === 'portfolio'
			? await app.d1.portfolioPhotos.getById(id)
			: await app.d1.reviewPhotos.getById(id);

	if (!photo) {
		return jsonError(`Photo not found: ${id}`, 404);
	}

	try {
		const result = await processPhotoIngest(app, bucket, id);
		return jsonOk({
			id: result.id,
			bucket,
			status: result.status,
			variants: result.variants,
		});
	} catch (error) {
		if (error instanceof IngestProcessError) {
			return jsonError(error.message, 422);
		}
		const message = error instanceof Error ? error.message : 'Reprocess failed';
		return jsonError(message, 500);
	}
};
