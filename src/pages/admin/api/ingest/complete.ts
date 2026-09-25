import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { createDb } from '../../../../db/client.ts';
import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { isPurposeBucket } from '../../../../lib/ingest/buckets.ts';
import { IngestProcessError, processPhotoIngest } from '../../../../lib/ingest/process.ts';

type CompleteBody = {
	id?: unknown;
	bucket?: unknown;
};

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

	let body: CompleteBody;
	try {
		body = (await request.json()) as CompleteBody;
	} catch {
		return jsonError('Invalid JSON body', 400);
	}

	if (typeof body.id !== 'string' || !body.id.trim()) {
		return jsonError('id is required', 400);
	}
	if (!isPurposeBucket(body.bucket)) {
		return jsonError('bucket must be "portfolio" or "review"', 400);
	}

	try {
		const db = createDb(env.DB);
		const result = await processPhotoIngest(db, env, body.bucket, body.id.trim());
		return jsonOk({
			id: result.id,
			bucket: body.bucket,
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
