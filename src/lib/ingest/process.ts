import { r2Binding } from './buckets.ts';
import { VARIANT_SPECS, variantKey } from './keys.ts';
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
 * Failure behavior is intentionally minimal (HLD `_TBD_` details): mark failed + return error.
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

	const r2 = r2Binding(env, bucket);
	const object = await r2.get(photo.originalKey);
	if (!object) {
		await updatePhotoStatus(db, bucket, id, {
			status: 'failed',
			error: 'Original missing in R2 (incomplete PUT?)',
		});
		throw new IngestProcessError('Original missing in R2 (incomplete PUT?)');
	}

	try {
		const source = await object.arrayBuffer();
		const written: string[] = [];

		for (const spec of VARIANT_SPECS) {
			const key = variantKey(id, spec.suffix);
			const result = await env.IMAGES.input(new Blob([source]).stream())
				.transform({ width: spec.width, fit: 'scale-down' })
				.output({ format: 'image/webp', quality: 80 });

			await r2.put(key, result.image(), {
				httpMetadata: { contentType: spec.contentType },
			});
			written.push(key);
		}

		await updatePhotoStatus(db, bucket, id, { status: 'ready', error: null });
		return { id, status: 'ready', variants: written };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Ingest failed';
		await updatePhotoStatus(db, bucket, id, { status: 'failed', error: message });
		throw new IngestProcessError(message);
	}
}
