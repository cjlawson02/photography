import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { createDb } from '../../../../db/client.ts';
import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { isPurposeBucket } from '../../../../lib/ingest/buckets.ts';
import { originalKey } from '../../../../lib/ingest/keys.ts';
import { insertPendingPhoto } from '../../../../lib/ingest/photos.ts';
import {
	createPresignedPutUrl,
	readR2S3Secrets,
	R2PresignConfigError,
} from '../../../../lib/ingest/presign.ts';

type PresignBody = {
	bucket?: unknown;
	contentType?: unknown;
	filename?: unknown;
};

/**
 * Mint a presigned PUT URL into PORTFOLIO or REVIEW and insert a pending D1 row.
 * JWT verified (defense in depth). Browser then PUTs to R2 and calls /complete.
 */
export const POST: APIRoute = async ({ request }) => {
	const auth = await requireAdmin(request, {
		CF_ACCESS_TEAM_DOMAIN: env.CF_ACCESS_TEAM_DOMAIN,
		CF_ACCESS_AUD: env.CF_ACCESS_AUD,
	});
	if (auth instanceof Response) return auth;

	let body: PresignBody;
	try {
		body = (await request.json()) as PresignBody;
	} catch {
		return jsonError('Invalid JSON body', 400);
	}

	if (!isPurposeBucket(body.bucket)) {
		return jsonError('bucket must be "portfolio" or "review"', 400);
	}
	if (typeof body.contentType !== 'string' || !body.contentType.trim()) {
		return jsonError('contentType is required', 400);
	}

	const contentType = body.contentType.trim();
	const id = crypto.randomUUID();
	const key = originalKey(id);

	try {
		const secrets = readR2S3Secrets(env);
		const { uploadUrl, expiresInSeconds } = await createPresignedPutUrl({
			secrets,
			bucket: body.bucket,
			key,
			contentType,
		});

		const db = createDb(env.DB);
		await insertPendingPhoto(db, body.bucket, { id, originalKey: key, contentType });

		return jsonOk({
			id,
			bucket: body.bucket,
			key,
			contentType,
			uploadUrl,
			expiresInSeconds,
			completeUrl: '/admin/api/ingest/complete',
		});
	} catch (error) {
		if (error instanceof R2PresignConfigError) {
			return jsonError(error.message, 503);
		}
		const message = error instanceof Error ? error.message : 'Presign failed';
		return jsonError(message, 500);
	}
};
