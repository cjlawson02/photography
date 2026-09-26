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

const DEFAULT_EXPIRES_SECONDS = 900;

type R2Bindings = {
  PORTFOLIO: R2Bucket;
  REVIEW: R2Bucket;
};

/**
 * R2 access — Worker bindings for get/put + aws4fetch for virtual-hosted presign.
 * Virtual-hosted URL: `https://{bucket}.{accountId}.r2.cloudflarestorage.com/{key}`
 * Production bootstrap always passes validated S3 secrets from `getCloudflareEnv`.
 */
export class R2DAO {
  private static bindingsInstance: R2DAO | undefined;
  private static ingestInstance: R2DAO | undefined;

  private readonly aws: AwsClient | undefined;
  private readonly accountId: string;
  private readonly bindings: R2Bindings;

  private constructor(bindings: R2Bindings, secrets: R2S3Secrets | null) {
    this.bindings = bindings;
    if (secrets) {
      this.accountId = secrets.accountId;
      this.aws = new AwsClient({
        accessKeyId: secrets.accessKeyId,
        secretAccessKey: secrets.secretAccessKey,
        service: 's3',
        region: 'auto',
      });
    } else {
      this.accountId = '';
    }
  }

  /** Worker binding get/put/delete — no S3 API secrets. */
  static getBindingsInstance(bindings: R2Bindings): R2DAO {
    if (!R2DAO.bindingsInstance) {
      R2DAO.bindingsInstance = new R2DAO(bindings, null);
    }
    return R2DAO.bindingsInstance;
  }

  /** Presigned PUT + binding ops — requires validated S3 secrets. */
  static getIngestInstance(bindings: R2Bindings, secrets: R2S3Secrets): R2DAO {
    if (!R2DAO.ingestInstance) {
      R2DAO.ingestInstance = new R2DAO(bindings, secrets);
    }
    return R2DAO.ingestInstance;
  }

  /** @deprecated Use getIngestInstance or getBindingsInstance. */
  static getInstance(bindings: R2Bindings, secrets: R2S3Secrets): R2DAO {
    return R2DAO.getIngestInstance(bindings, secrets);
  }

  static resetInstance(): void {
    R2DAO.bindingsInstance = undefined;
    R2DAO.ingestInstance = undefined;
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

  /** Worker binding get — originals / variants inside a purpose bucket. */
  async get(purpose: PurposeBucket, key: string): Promise<R2ObjectBody | null> {
    return this.bucket(purpose).get(key);
  }

  /** Worker binding put — originals (server-side) or variant bytes after Images. */
  async put(
    purpose: PurposeBucket,
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: R2PutOptions,
  ): Promise<R2Object> {
    return this.bucket(purpose).put(key, value, options);
  }

  /** Worker binding delete — single key. */
  async deleteObject(purpose: PurposeBucket, key: string): Promise<void> {
    await this.bucket(purpose).delete(key);
  }

  /** Worker binding batch delete — up to 1000 keys per R2 call. */
  async deleteObjects(purpose: PurposeBucket, keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    const bucket = this.bucket(purpose);
    const chunkSize = 1000;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await bucket.delete(keys.slice(i, i + chunkSize));
    }
  }

  /**
   * Mint a browser-facing presigned PUT (virtual-hosted style + signQuery).
   * Requires R2 S3 API secrets (always present on instances from AppEnv).
   */
  async createPresignedPutUrl(options: {
    bucket: PurposeBucket;
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
    if (!this.aws) {
      throw new R2ConfigError(
        'R2 S3 secrets not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)',
      );
    }
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
