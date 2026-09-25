import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { IngestProcessError, processPhotoIngest } from '../../../../lib/ingest/process.ts';
import { completeBodySchema, formatZodError } from '../../../../lib/ingest/schemas.ts';

/**
 * v1 completion callback after browser PUT to R2.
 * Images Free compress-once → put variant bytes → mark D1 ready/failed.
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

	const parsed = completeBodySchema.safeParse(raw);
	if (!parsed.success) {
		return jsonError(formatZodError(parsed.error), 400);
	}
	const { id, bucket } = parsed.data;

	try {
		const app = AppEnv.from(env);
		const result = await processPhotoIngest(app, bucket, id);
		return jsonOk({
			id: result.id,
			bucket,
			status: result.status,
			variants: result.variants,
		});
	} catch (error) {
		if (error instanceof IngestProcessError) {
			const status = error.message.includes('not found') ? 404 : 422;
			return jsonError(error.message, status);
		}
		const message = error instanceof Error ? error.message : 'Complete failed';
		return jsonError(message, 500);
	}
};
