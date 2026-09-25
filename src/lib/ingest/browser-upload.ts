/**
 * Browser upload client (v1): presign → PUT to R2 → completion callback.
 * Same-origin admin UI sends Access cookie automatically on `/admin/api/*`.
 */

import type { PurposeBucket } from '../dao/r2-dao.ts';

export type PresignResponse = {
	ok: true;
	id: string;
	bucket: PurposeBucket;
	key: string;
	contentType: string;
	uploadUrl: string;
	expiresInSeconds: number;
	completeUrl: string;
	collectionId?: string;
};

export type CompleteResponse = {
	ok: true;
	id: string;
	bucket: PurposeBucket;
	status: 'ready';
	variants: string[];
};

export type UploadResult = {
	id: string;
	bucket: PurposeBucket;
	status: 'ready';
	variants: string[];
};

const DEFAULT_PRESIGN_PATH = '/admin/api/ingest/presign';
const DEFAULT_COMPLETE_PATH = '/admin/api/ingest/complete';

type PortfolioUpload = {
	file: File;
	bucket: 'portfolio';
	presignPath?: string;
	completePath?: string;
};

type ReviewUpload = {
	file: File;
	bucket: 'review';
	/** Required for review — FK to ReviewCollections. */
	collectionId: string;
	presignPath?: string;
	completePath?: string;
};

/**
 * Full v1 ingest path from the browser.
 * Requires Cloudflare Access session (cookie) on `/admin*`.
 * Review uploads must pass `collectionId`.
 */
export async function uploadPhoto(options: PortfolioUpload | ReviewUpload): Promise<UploadResult> {
	const contentType = options.file.type || 'application/octet-stream';
	const presign = await requestPresign({
		bucket: options.bucket,
		contentType,
		filename: options.file.name,
		collectionId: options.bucket === 'review' ? options.collectionId : undefined,
		presignPath: options.presignPath ?? DEFAULT_PRESIGN_PATH,
	});

	const put = await fetch(presign.uploadUrl, {
		method: 'PUT',
		headers: { 'Content-Type': contentType },
		body: options.file,
	});

	if (!put.ok) {
		throw new Error(`R2 PUT failed (${put.status})`);
	}

	const complete = await requestComplete({
		id: presign.id,
		bucket: options.bucket,
		completePath: options.completePath ?? DEFAULT_COMPLETE_PATH,
	});

	return {
		id: complete.id,
		bucket: complete.bucket,
		status: complete.status,
		variants: complete.variants,
	};
}

export async function requestPresign(input: {
	bucket: PurposeBucket;
	contentType: string;
	filename?: string;
	/** Required when `bucket` is `review`. */
	collectionId?: string;
	presignPath?: string;
}): Promise<PresignResponse> {
	const body: Record<string, string> = {
		bucket: input.bucket,
		contentType: input.contentType,
	};
	if (input.filename) body.filename = input.filename;
	if (input.bucket === 'review') {
		if (!input.collectionId?.trim()) {
			throw new Error('collectionId is required for review uploads');
		}
		body.collectionId = input.collectionId.trim();
	}

	const response = await fetch(input.presignPath ?? DEFAULT_PRESIGN_PATH, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body),
	});

	const parsed = (await response.json()) as PresignResponse | { ok: false; error?: string };
	if (!response.ok || !parsed.ok) {
		const message =
			'error' in parsed && parsed.error ? parsed.error : `Presign failed (${response.status})`;
		throw new Error(message);
	}
	return parsed;
}

export async function requestComplete(input: {
	id: string;
	bucket: PurposeBucket;
	completePath?: string;
}): Promise<CompleteResponse> {
	const response = await fetch(input.completePath ?? DEFAULT_COMPLETE_PATH, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({ id: input.id, bucket: input.bucket }),
	});

	const parsed = (await response.json()) as CompleteResponse | { ok: false; error?: string };
	if (!response.ok || !parsed.ok) {
		const message =
			'error' in parsed && parsed.error ? parsed.error : `Complete failed (${response.status})`;
		throw new Error(message);
	}
	return parsed;
}

export async function requestReprocess(input: {
	id: string;
	bucket: PurposeBucket;
	reprocessPath?: string;
}): Promise<CompleteResponse> {
	const response = await fetch(input.reprocessPath ?? '/admin/api/ingest/reprocess', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({ id: input.id, bucket: input.bucket }),
	});

	const parsed = (await response.json()) as CompleteResponse | { ok: false; error?: string };
	if (!response.ok || !parsed.ok) {
		const message =
			'error' in parsed && parsed.error
				? parsed.error
				: `Reprocess failed (${response.status})`;
		throw new Error(message);
	}
	return parsed;
}
