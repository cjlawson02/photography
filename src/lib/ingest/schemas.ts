import { z } from 'zod/v4';

import {
	idSchema,
	optionalTrimmedString,
	requiredTrimmedString,
} from '../../db/schema/types.ts';

export const purposeBucketSchema = z.enum(['portfolio', 'review']);

export type PurposeBucket = z.infer<typeof purposeBucketSchema>;

/**
 * Presign body — review requires `collectionId` (FK to ReviewCollections).
 * Portfolio has no collection in the current schema.
 */
export const presignBodySchema = z.discriminatedUnion('bucket', [
	z.object({
		bucket: z.literal('portfolio'),
		contentType: requiredTrimmedString,
		filename: optionalTrimmedString,
	}),
	z.object({
		bucket: z.literal('review'),
		contentType: requiredTrimmedString,
		collectionId: idSchema,
		filename: optionalTrimmedString,
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

/** Format Zod issues into a single plain error string for HTTP responses. */
export function formatZodError(error: z.ZodError): string {
	return error.issues.map((issue) => issue.message).join('; ') || 'Invalid request body';
}
