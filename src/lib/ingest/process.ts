import type { PurposeBucket } from '../dao/r2-dao.ts';
import type { AppEnv } from '../env.ts';
import { originalKey, VARIANT_SPECS, variantKey } from './keys.ts';

export class IngestProcessError extends Error {
	override name = 'IngestProcessError';
}

/**
 * Compress-once via Images Free, put variant bytes beside the original, mark ready/failed.
 * Failures are logged (not stored in D1); status may become `failed` without an error string.
 */
export async function processPhotoIngest(
	app: AppEnv,
	bucket: PurposeBucket,
	id: string,
): Promise<{ id: string; status: 'ready'; variants: string[] }> {
	const photo =
		bucket === 'portfolio'
			? await app.d1.portfolioPhotos.getById(id)
			: await app.d1.reviewPhotos.getById(id);

	if (!photo) {
		throw new IngestProcessError(`Photo not found: ${id}`);
	}

	const key = originalKey(id);
	const object = await app.r2.get(bucket, key);
	if (!object) {
		const message = `Original missing in R2 for ${bucket}/${id} (incomplete PUT?)`;
		console.error('[ingest]', message);
		await markFailed(app, bucket, id);
		throw new IngestProcessError(message);
	}

	try {
		const source = await object.arrayBuffer();
		const written: string[] = [];

		for (const spec of VARIANT_SPECS) {
			const variant = variantKey(id, spec.suffix);
			const webp = await app.images.toWebp(new Blob([source]).stream(), {
				width: spec.width,
				quality: 80,
			});
			await app.r2.put(bucket, variant, webp, {
				httpMetadata: { contentType: spec.contentType },
			});
			written.push(variant);
		}

		await markReady(app, bucket, id);
		return { id, status: 'ready', variants: written };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Ingest failed';
		console.error('[ingest]', `Compress/put failed for ${bucket}/${id}:`, error);
		await markFailed(app, bucket, id);
		throw new IngestProcessError(message);
	}
}

async function markReady(app: AppEnv, bucket: PurposeBucket, id: string): Promise<void> {
	if (bucket === 'portfolio') {
		await app.d1.portfolioPhotos.update(id, { status: 'ready' });
	} else {
		await app.d1.reviewPhotos.update(id, { status: 'ready' });
	}
}

async function markFailed(app: AppEnv, bucket: PurposeBucket, id: string): Promise<void> {
	if (bucket === 'portfolio') {
		await app.d1.portfolioPhotos.update(id, { status: 'failed' });
	} else {
		await app.d1.reviewPhotos.update(id, { status: 'failed' });
	}
}
