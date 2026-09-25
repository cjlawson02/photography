import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { createDb } from '../../../../db/client.ts';
import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { isPurposeBucket } from '../../../../lib/ingest/buckets.ts';
import { getPhoto } from '../../../../lib/ingest/photos.ts';
import { IngestProcessError, processPhotoIngest } from '../../../../lib/ingest/process.ts';

type ReprocessBody = {
	id?: unknown;
	bucket?: unknown;
};

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

	let body: ReprocessBody;
	try {
		body = (await request.json()) as ReprocessBody;
	} catch {
		return jsonError('Invalid JSON body', 400);
	}

	if (typeof body.id !== 'string' || !body.id.trim()) {
		return jsonError('id is required', 400);
	}
	if (!isPurposeBucket(body.bucket)) {
		return jsonError('bucket must be "portfolio" or "review"', 400);
	}

	const id = body.id.trim();
	const db = createDb(env.DB);
	const photo = await getPhoto(db, body.bucket, id);
	if (!photo) {
		return jsonError(`Photo not found: ${id}`, 404);
	}

	try {
		const result = await processPhotoIngest(db, env, body.bucket, id);
		return jsonOk({
			id: result.id,
			bucket: body.bucket,
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
