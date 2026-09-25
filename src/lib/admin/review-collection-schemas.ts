import { z } from 'zod/v4';

import { reviewCollectionInsertSchema } from '../../db/schema/types.ts';

/** POST `/admin/api/review/collections` — slug required; title and expiresAt optional. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema.pick({
	slug: true,
	title: true,
	expiresAt: true,
});

/** DELETE `/admin/api/review/collections/{id}` query params. */
export const reviewCollectionDeleteQuerySchema = z.object({
	cleanupR2: z
		.enum(['true', 'false'])
		.optional()
		.transform((value) => value !== 'false'),
});
