import { AwsClient } from 'aws4fetch';

/** Purpose buckets matching wrangler R2 bindings / bucket names. */
export type PurposeBucket = 'portfolio' | 'review';

export const R2_BUCKET_NAMES = {
	portfolio: 'photography-portfolio',
	review: 'photography-review',
} as const satisfies Record<PurposeBucket, string>;

export type R2S3Secrets = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
};

export class R2ConfigError extends Error {
	override name = 'R2ConfigError';
}

const DEFAULT_EXPIRES_SECONDS = 3600;

type R2Bindings = {
	PORTFOLIO: R2Bucket;
	REVIEW: R2Bucket;
};

/**
 * R2 access — Worker bindings for get/put + aws4fetch for virtual-hosted presign.
 * Virtual-hosted URL: `https://{bucket}.{accountId}.r2.cloudflarestorage.com/{key}`
 */
export class R2DAO {
	private static instance: R2DAO | undefined;

	private readonly aws: AwsClient;
	private readonly accountId: string;

	private constructor(
		private readonly bindings: R2Bindings,
		secrets: R2S3Secrets,
	) {
		this.accountId = secrets.accountId;
		this.aws = new AwsClient({
			accessKeyId: secrets.accessKeyId,
			secretAccessKey: secrets.secretAccessKey,
			service: 's3',
			region: 'auto',
		});
	}

	static getInstance(bindings: R2Bindings, secrets: R2S3Secrets): R2DAO {
		if (!R2DAO.instance) {
			R2DAO.instance = new R2DAO(bindings, secrets);
		}
		return R2DAO.instance;
	}

	static resetInstance(): void {
		R2DAO.instance = undefined;
	}

	static readSecrets(env: {
		R2_ACCOUNT_ID?: string;
		R2_ACCESS_KEY_ID?: string;
		R2_SECRET_ACCESS_KEY?: string;
	}): R2S3Secrets {
		const secrets = {
			accountId: env.R2_ACCOUNT_ID?.trim() ?? '',
			accessKeyId: env.R2_ACCESS_KEY_ID?.trim() ?? '',
			secretAccessKey: env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
		};
		if (!secrets.accountId || !secrets.accessKeyId || !secrets.secretAccessKey) {
			throw new R2ConfigError(
				'R2 S3 secrets not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)',
			);
		}
		return secrets;
	}

	bucket(purpose: PurposeBucket): R2Bucket {
		return purpose === 'portfolio' ? this.bindings.PORTFOLIO : this.bindings.REVIEW;
	}

	bucketName(purpose: PurposeBucket): string {
		return R2_BUCKET_NAMES[purpose];
	}

	/**
	 * Mint a browser-facing presigned PUT (virtual-hosted style + signQuery).
	 * Full ingest handlers that call this land in the follow-up PR.
	 */
	async createPresignedPutUrl(options: {
		bucket: PurposeBucket;
		key: string;
		contentType: string;
		expiresInSeconds?: number;
	}): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
		const expiresInSeconds = options.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS;
		const bucketName = this.bucketName(options.bucket);
		const url = new URL(
			`https://${bucketName}.${this.accountId}.r2.cloudflarestorage.com/${encodeKey(options.key)}`,
		);
		url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));

		const signed = await this.aws.sign(
			new Request(url, {
				method: 'PUT',
				headers: { 'Content-Type': options.contentType },
			}),
			{ aws: { signQuery: true } },
		);

		return { uploadUrl: signed.url, expiresInSeconds };
	}
}

/** Encode each path segment; keep `/` separators. */
function encodeKey(key: string): string {
	return key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}
