import type { AppEnv } from '../env.ts';
import { AppError } from '../http/app-error.ts';
import { originalKey, VARIANT_SPECS, variantKey } from '../ingest/keys.ts';
import {
  INGEST_MAX_ORIGINAL_BYTES,
  type CompleteBody,
  type PresignBody,
  type ReprocessBody,
} from '../ingest/schemas.ts';
import type { PurposeBucket } from '../dao/r2-dao.ts';
import type { PhotoStatus } from '../../db/schema/photo-status.ts';

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

  private photosDao(bucket: PurposeBucket) {
    return bucket === 'portfolio' ? this.app.d1.portfolioPhotos : this.app.d1.reviewPhotos;
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
    return this.processFromOriginal(input.bucket, input.id, { allowStatuses: ['pending'] });
  }

  /** Re-run variants from the stored original. */
  async reprocess(input: ReprocessBody): Promise<IngestResult> {
    return this.processFromOriginal(input.bucket, input.id, {
      allowStatuses: ['pending', 'failed', 'ready'],
    });
  }

  private async processFromOriginal(
    bucket: PurposeBucket,
    id: string,
    options: { allowStatuses: PhotoStatus[] },
  ): Promise<IngestResult> {
    const photo = await this.photosDao(bucket).getById(id);

    if (!photo) {
      throw new AppError('NOT_FOUND', `Photo not found: ${id}`);
    }

    if (!options.allowStatuses.includes(photo.status)) {
      throw new AppError(
        'PRECONDITION_FAILED',
        `Photo ${id} status is ${photo.status}; expected ${options.allowStatuses.join('|')}`,
      );
    }

    const priorStatus = photo.status;
    const key = originalKey(id);
    const object = await this.app.r2.get(bucket, key);
    if (!object) {
      const message = `Original missing in R2 for ${bucket}/${id} (incomplete PUT?)`;
      console.error('[ingest]', message);
      if (priorStatus !== 'ready') {
        await this.markFailed(bucket, id, priorStatus);
      }
      throw new AppError('PRECONDITION_FAILED', message);
    }

    if (typeof object.size === 'number' && object.size > INGEST_MAX_ORIGINAL_BYTES) {
      const message = `Original too large for ${bucket}/${id} (${object.size} bytes)`;
      console.error('[ingest]', message);
      if (priorStatus !== 'ready') {
        await this.markFailed(bucket, id, priorStatus);
      }
      throw new AppError('BAD_REQUEST', message);
    }

    const written: string[] = [];

    try {
      const source = await object.arrayBuffer();

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

      const dimensions = await this.app.images.readDimensions(new Blob([source]).stream());
      await this.markReady(bucket, id, dimensions, priorStatus, written);
      return { id, bucket, status: 'ready', variants: written };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : 'Ingest failed';
      console.error('[ingest]', `Compress/put failed for ${bucket}/${id}:`, error);
      if (priorStatus !== 'ready') {
        await this.markFailed(bucket, id, priorStatus);
      } else if (written.length > 0) {
        await this.deleteWrittenVariants(bucket, written);
      }
      throw new AppError('INTERNAL_SERVER_ERROR', message);
    }
  }

  private async markReady(
    bucket: PurposeBucket,
    id: string,
    dimensions: { width: number; height: number } | null,
    expectedStatus: PhotoStatus,
    writtenVariants: string[],
  ): Promise<void> {
    const patch = {
      status: 'ready' as const,
      ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
    };
    const updated = await this.photosDao(bucket).updateIfStatus(id, expectedStatus, patch);
    if (!updated) {
      await this.deleteWrittenVariants(bucket, writtenVariants);
      const row = await this.photosDao(bucket).getById(id);
      if (!row) {
        throw new AppError('NOT_FOUND', `Photo not found during markReady: ${id}`);
      }
      throw new AppError(
        'PRECONDITION_FAILED',
        `Photo ${id} status changed during ingest (expected ${expectedStatus})`,
      );
    }
  }

  private async markFailed(
    bucket: PurposeBucket,
    id: string,
    expectedStatus: PhotoStatus,
  ): Promise<void> {
    const updated = await this.photosDao(bucket).updateIfStatus(id, expectedStatus, {
      status: 'failed',
    });
    if (!updated) {
      console.warn('[ingest] markFailed skipped — row missing or status changed', {
        bucket,
        id,
        expectedStatus,
      });
    }
  }

  private async deleteWrittenVariants(bucket: PurposeBucket, keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    try {
      await this.app.r2.deleteObjects(bucket, keys);
    } catch (error) {
      console.error('[ingest] failed to delete orphaned variants', { bucket, keys, error });
    }
  }
}
