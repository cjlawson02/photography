import { AwsClient } from 'aws4fetch';

import { s3BucketName } from './buckets.ts';
import type { PurposeBucket } from './types.ts';

export type R2S3Secrets = {
	R2_ACCOUNT_ID: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
};

export class R2PresignConfigError extends Error {
	override name = 'R2PresignConfigError';
}

const DEFAULT_EXPIRES_SECONDS = 3600;

/**
 * Mint a browser-facing presigned PUT URL for an object key in a purpose bucket.
 * Requires R2 S3 API secrets (not covered by R2 Worker bindings alone).
 * @see https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 */
export async function createPresignedPutUrl(options: {
	secrets: R2S3Secrets;
	bucket: PurposeBucket;
	key: string;
	contentType: string;
	expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
	const { secrets, bucket, key, contentType } = options;
	const expiresInSeconds = options.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS;

	assertSecrets(secrets);

	const client = new AwsClient({
		accessKeyId: secrets.R2_ACCESS_KEY_ID,
		secretAccessKey: secrets.R2_SECRET_ACCESS_KEY,
		service: 's3',
		region: 'auto',
	});

	const url = new URL(
		`https://${secrets.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${s3BucketName(bucket)}/${encodeKey(key)}`,
	);
	url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));

	const signed = await client.sign(
		new Request(url, {
			method: 'PUT',
			headers: { 'Content-Type': contentType },
		}),
		{ aws: { signQuery: true } },
	);

	return { uploadUrl: signed.url, expiresInSeconds };
}

export function readR2S3Secrets(env: {
	R2_ACCOUNT_ID?: string;
	R2_ACCESS_KEY_ID?: string;
	R2_SECRET_ACCESS_KEY?: string;
}): R2S3Secrets {
	const secrets = {
		R2_ACCOUNT_ID: env.R2_ACCOUNT_ID?.trim() ?? '',
		R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID?.trim() ?? '',
		R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
	};
	assertSecrets(secrets);
	return secrets;
}

function assertSecrets(secrets: R2S3Secrets): void {
	if (!secrets.R2_ACCOUNT_ID || !secrets.R2_ACCESS_KEY_ID || !secrets.R2_SECRET_ACCESS_KEY) {
		throw new R2PresignConfigError(
			'R2 S3 secrets not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)',
		);
	}
}

/** Encode each path segment; keep `/` separators. */
function encodeKey(key: string): string {
	return key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}
