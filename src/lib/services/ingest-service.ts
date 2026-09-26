import type { AppEnv } from '../env.ts';
import { AppError } from '../http/app-error.ts';
import { originalKey, VARIANT_SPECS, variantKey } from '../ingest/keys.ts';
import type { CompleteBody, PresignBody, ReprocessBody } from '../ingest/schemas.ts';
import type { PurposeBucket } from '../dao/r2-dao.ts';

export type PresignResult = {
  id: string;
  bucket: PurposeBucket;
  key: string;
  contentType: string;
  uploadUrl: string;
  expiresInSeconds: number;
  collectionId?: string;
};

export type IngestResult = {
  id: string;
  bucket: PurposeBucket;
  status: 'ready';
  variants: string[];
};

/** Ingest pipeline — admin UI calls via tRPC (`ingest.*`). */
export class IngestService {
  constructor(private readonly app: AppEnv) {}

  static from(app: AppEnv): IngestService {
    return new IngestService(app);
  }

  /** Create a pending photo row and mint a browser PUT URL. */
  async createPresign(input: PresignBody): Promise<PresignResult> {
    if (input.bucket === 'review') {
      const collection = await this.app.d1.reviewCollections.getById(input.collectionId);
      if (!collection) {
        throw new AppError('NOT_FOUND', `Review collection not found: ${input.collectionId}`);
      }
    }

    const photo =
      input.bucket === 'portfolio'
        ? await this.app.d1.portfolioPhotos.insert({
            status: 'pending',
            mimeType: input.contentType,
          })
        : await this.app.d1.reviewPhotos.insert({
            collectionId: input.collectionId,
            status: 'pending',
            mimeType: input.contentType,
          });

    const key = originalKey(photo.id);
    const { uploadUrl, expiresInSeconds } = await this.app.r2.createPresignedPutUrl({
      bucket: input.bucket,
      key,
      contentType: input.contentType,
    });

    return {
      id: photo.id,
      bucket: input.bucket,
      key,
      contentType: input.contentType,
      uploadUrl,
      expiresInSeconds,
      ...(input.bucket === 'review' ? { collectionId: input.collectionId } : {}),
    };
  }

  /** After browser PUT: compress-once → put variants → mark ready (or failed). */
  async completeIngest(input: CompleteBody): Promise<IngestResult> {
    return this.processFromOriginal(input.bucket, input.id);
  }

  /** Re-run variants from the stored original. */
  async reprocess(input: ReprocessBody): Promise<IngestResult> {
    return this.processFromOriginal(input.bucket, input.id);
  }

  private async processFromOriginal(bucket: PurposeBucket, id: string): Promise<IngestResult> {
    const photo =
      bucket === 'portfolio'
        ? await this.app.d1.portfolioPhotos.getById(id)
        : await this.app.d1.reviewPhotos.getById(id);

    if (!photo) {
      throw new AppError('NOT_FOUND', `Photo not found: ${id}`);
    }

    const key = originalKey(id);
    const object = await this.app.r2.get(bucket, key);
    if (!object) {
      const message = `Original missing in R2 for ${bucket}/${id} (incomplete PUT?)`;
      console.error('[ingest]', message);
      await this.markFailed(bucket, id);
      throw new AppError('PRECONDITION_FAILED', message);
    }

    try {
      const source = await object.arrayBuffer();
      const written: string[] = [];

      for (const spec of VARIANT_SPECS) {
        const variant = variantKey(id, spec.suffix);
        const webp = await this.app.images.toWebp(new Blob([source]).stream(), {
          width: spec.width,
          quality: 80,
        });
        await this.app.r2.put(bucket, variant, webp, {
          httpMetadata: { contentType: spec.contentType },
        });
        written.push(variant);
      }

      await this.markReady(bucket, id);
      return { id, bucket, status: 'ready', variants: written };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingest failed';
      console.error('[ingest]', `Compress/put failed for ${bucket}/${id}:`, error);
      await this.markFailed(bucket, id);
      throw new AppError('INTERNAL_SERVER_ERROR', message);
    }
  }

  private async markReady(bucket: PurposeBucket, id: string): Promise<void> {
    if (bucket === 'portfolio') {
      await this.app.d1.portfolioPhotos.update(id, { status: 'ready' });
    } else {
      await this.app.d1.reviewPhotos.update(id, { status: 'ready' });
    }
  }

  private async markFailed(bucket: PurposeBucket, id: string): Promise<void> {
    if (bucket === 'portfolio') {
      await this.app.d1.portfolioPhotos.update(id, { status: 'failed' });
    } else {
      await this.app.d1.reviewPhotos.update(id, { status: 'failed' });
    }
  }
}
