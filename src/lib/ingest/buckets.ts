import type { PurposeBucket } from './types.ts';

/** S3 bucket names for presigned PUT (must match wrangler.jsonc r2_buckets). */
export const R2_BUCKET_NAMES = {
	portfolio: 'photography-portfolio',
	review: 'photography-review',
} as const satisfies Record<PurposeBucket, string>;

export function isPurposeBucket(value: unknown): value is PurposeBucket {
	return value === 'portfolio' || value === 'review';
}

export function r2Binding(
	env: { PORTFOLIO: R2Bucket; REVIEW: R2Bucket },
	bucket: PurposeBucket,
): R2Bucket {
	return bucket === 'portfolio' ? env.PORTFOLIO : env.REVIEW;
}

export function s3BucketName(bucket: PurposeBucket): string {
	return R2_BUCKET_NAMES[bucket];
}
