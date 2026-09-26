/**
 * Browser upload client (v1): presign → PUT to R2 → completion callback.
 * Admin mutations use tRPC (`/admin/api/trpc`); same-origin sends Access cookie on `/admin*`.
 */

import { TRPCClientError } from '@trpc/client';

import type { PurposeBucket } from '../dao/r2-dao.ts';
import { adminTrpc } from '../trpc/client.ts';

export type PresignResponse = {
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

type PortfolioUpload = {
	file: File;
	bucket: 'portfolio';
};

type ReviewUpload = {
	file: File;
	bucket: 'review';
	/** Required for review — FK to ReviewCollections. */
	collectionId: string;
};

function trpcMessage(error: unknown, fallback: string): string {
	if (error instanceof TRPCClientError) {
		return error.message || fallback;
	}
	return error instanceof Error ? error.message : fallback;
}

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
}): Promise<PresignResponse> {
	try {
		const body =
			input.bucket === 'review'
				? {
						bucket: 'review' as const,
						contentType: input.contentType,
						collectionId: requireReviewCollectionId(input.collectionId),
						...(input.filename ? { filename: input.filename } : {}),
					}
				: {
						bucket: 'portfolio' as const,
						contentType: input.contentType,
						...(input.filename ? { filename: input.filename } : {}),
					};

		return await adminTrpc.ingest.presign.mutate(body);
	} catch (error) {
		throw new Error(trpcMessage(error, 'Presign failed'));
	}
}

export async function requestComplete(input: {
	id: string;
	bucket: PurposeBucket;
}): Promise<CompleteResponse> {
	try {
		return await adminTrpc.ingest.complete.mutate({
			id: input.id,
			bucket: input.bucket,
		});
	} catch (error) {
		throw new Error(trpcMessage(error, 'Complete failed'));
	}
}

export async function requestReprocess(input: {
	id: string;
	bucket: PurposeBucket;
}): Promise<CompleteResponse> {
	try {
		return await adminTrpc.ingest.reprocess.mutate({
			id: input.id,
			bucket: input.bucket,
		});
	} catch (error) {
		throw new Error(trpcMessage(error, 'Reprocess failed'));
	}
}

function requireReviewCollectionId(collectionId: string | undefined): string {
	const trimmed = collectionId?.trim();
	if (!trimmed) {
		throw new Error('collectionId is required for review uploads');
	}
	return trimmed;
}
