import { AppError } from '../http/app-error.ts';
import { photoIngestObjectKeys } from '../ingest/keys.ts';
import type { PurposeBucket } from './r2-dao.ts';

type R2DeleteBatch = {
  deleteObjects: (purpose: PurposeBucket, keys: string[]) => Promise<void>;
};

/**
 * Purge original + variant keys for one or more photo ids.
 * On R2 failure: log and throw AppError INTERNAL (callers map to HTTP).
 */
export async function deletePhotoObjects(options: {
  r2: R2DeleteBatch;
  bucket: PurposeBucket;
  photoIds: string[];
  logLabel: string;
  logDetails?: Record<string, unknown>;
  errorMessage: string;
}): Promise<void> {
  const keys = options.photoIds.flatMap((id) => photoIngestObjectKeys(id));
  if (keys.length === 0) {
    return;
  }

  try {
    await options.r2.deleteObjects(options.bucket, keys);
  } catch (error) {
    console.error(`[${options.logLabel}] R2 batch delete failed`, {
      ...options.logDetails,
      keys,
      keyCount: keys.length,
      error,
    });
    throw new AppError('INTERNAL_SERVER_ERROR', options.errorMessage);
  }
}
