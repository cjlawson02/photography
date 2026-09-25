import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

import { jsonError, jsonOk, requireAdmin } from '../../../../lib/admin/http.ts';
import { R2ConfigError } from '../../../../lib/dao/r2-dao.ts';
import { AppEnv } from '../../../../lib/env.ts';
import { originalKey } from '../../../../lib/ingest/keys.ts';
import { formatZodError, presignBodySchema } from '../../../../lib/ingest/schemas.ts';

/**
 * Mint a presigned PUT URL into PORTFOLIO or REVIEW and insert a pending D1 row.
 * Review requires `collectionId` (existing ReviewCollections row).
 * JWT verified (defense in depth). Browser then PUTs to R2 and calls /complete.
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

	const parsed = presignBodySchema.safeParse(raw);
	if (!parsed.success) {
		return jsonError(formatZodError(parsed.error), 400);
	}
	const body = parsed.data;

	try {
		const app = AppEnv.from(env);

		if (body.bucket === 'review') {
			const collection = await app.d1.reviewCollections.getById(body.collectionId);
			if (!collection) {
				return jsonError(`Review collection not found: ${body.collectionId}`, 404);
			}
		}

		const photo =
			body.bucket === 'portfolio'
				? await app.d1.portfolioPhotos.insert({
						status: 'pending',
						mimeType: body.contentType,
					})
				: await app.d1.reviewPhotos.insert({
						collectionId: body.collectionId,
						status: 'pending',
						mimeType: body.contentType,
					});

		const key = originalKey(photo.id);
		const { uploadUrl, expiresInSeconds } = await app.r2.createPresignedPutUrl({
			bucket: body.bucket,
			key,
			contentType: body.contentType,
		});

		return jsonOk({
			id: photo.id,
			bucket: body.bucket,
			key,
			contentType: body.contentType,
			uploadUrl,
			expiresInSeconds,
			completeUrl: '/admin/api/ingest/complete',
			...(body.bucket === 'review' ? { collectionId: body.collectionId } : {}),
		});
	} catch (error) {
		console.error('[ingest] presign failed:', error);
		if (error instanceof R2ConfigError) {
			return jsonError(error.message, 503);
		}
		const message = error instanceof Error ? error.message : 'Presign failed';
		return jsonError(message, 500);
	}
};
