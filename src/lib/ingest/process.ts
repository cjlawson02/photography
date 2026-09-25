import { r2Binding } from './buckets.ts';
import { originalKey, VARIANT_SPECS, variantKey } from './keys.ts';
import { getPhoto, updatePhotoStatus } from './photos.ts';
import type { PurposeBucket } from './types.ts';
import type { Db } from '../../db/client.ts';

export class IngestProcessError extends Error {
	override name = 'IngestProcessError';
}

type ProcessEnv = {
	PORTFOLIO: R2Bucket;
	REVIEW: R2Bucket;
	IMAGES: ImagesBinding;
};

/**
 * Compress-once via Images Free, put variant bytes beside the original, mark ready/failed.
 * Failures are logged (not stored in D1); status may become `failed` without an error string.
 */
export async function processPhotoIngest(
	db: Db,
	env: ProcessEnv,
	bucket: PurposeBucket,
	id: string,
): Promise<{ id: string; status: 'ready'; variants: string[] }> {
	const photo = await getPhoto(db, bucket, id);
	if (!photo) {
		throw new IngestProcessError(`Photo not found: ${id}`);
	}

	const key = originalKey(id);
	const r2 = r2Binding(env, bucket);
	const object = await r2.get(key);
	if (!object) {
		const message = `Original missing in R2 for ${bucket}/${id} (incomplete PUT?)`;
		console.error('[ingest]', message);
		await updatePhotoStatus(db, bucket, id, 'failed');
		throw new IngestProcessError(message);
	}

	try {
		const source = await object.arrayBuffer();
		const written: string[] = [];

		for (const spec of VARIANT_SPECS) {
			const variant = variantKey(id, spec.suffix);
			const result = await env.IMAGES.input(new Blob([source]).stream())
				.transform({ width: spec.width, fit: 'scale-down' })
				.output({ format: 'image/webp', quality: 80 });

			await r2.put(variant, result.image(), {
				httpMetadata: { contentType: spec.contentType },
			});
			written.push(variant);
		}

		await updatePhotoStatus(db, bucket, id, 'ready');
		return { id, status: 'ready', variants: written };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Ingest failed';
		console.error('[ingest]', `Compress/put failed for ${bucket}/${id}:`, error);
		await updatePhotoStatus(db, bucket, id, 'failed');
		throw new IngestProcessError(message);
	}
}
