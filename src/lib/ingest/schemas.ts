import { z } from 'zod/v4';

import { REVIEW_PHOTO_ROUNDS } from '../../db/schema/review/round.ts';
import { idSchema, optionalTrimmedString } from '../../db/schema/types.ts';
import { PURPOSE_BUCKETS, type PurposeBucket } from '../dao/r2-dao.ts';

export type { PurposeBucket };

export const purposeBucketSchema = z.enum(PURPOSE_BUCKETS);

/** Browser upload MIME allowlist (presign + ingest). */
export const INGEST_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const ingestContentTypeSchema = z.enum(INGEST_CONTENT_TYPES);

/** Soft cap before `arrayBuffer()` during ingest (availability). */
export const INGEST_MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;

/**
 * Presign body — review requires `collectionId` (FK to ReviewCollections).
 * Portfolio has no collection in the current schema.
 */
export const presignBodySchema = z.discriminatedUnion('bucket', [
  z.object({
    bucket: z.literal('portfolio'),
    contentType: ingestContentTypeSchema,
    filename: optionalTrimmedString,
  }),
  z.object({
    bucket: z.literal('review'),
    contentType: ingestContentTypeSchema,
    collectionId: idSchema,
    filename: optionalTrimmedString,
    round: z.enum(REVIEW_PHOTO_ROUNDS).optional(),
  }),
]);

export const completeBodySchema = z.object({
  id: idSchema,
  bucket: purposeBucketSchema,
});

export const reprocessBodySchema = completeBodySchema;

export type PresignBody = z.infer<typeof presignBodySchema>;
export type CompleteBody = z.infer<typeof completeBodySchema>;
export type ReprocessBody = z.infer<typeof reprocessBodySchema>;

export function isPurposeBucket(value: unknown): value is PurposeBucket {
  return purposeBucketSchema.safeParse(value).success;
}
