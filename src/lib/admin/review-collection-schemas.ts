import { z } from 'zod/v4';

import { idSchema, reviewCollectionInsertSchema } from '../../db/schema/types.ts';

/** `review.collections.create` input — slug required; title and expiresAt optional. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema.pick({
  slug: true,
  title: true,
  expiresAt: true,
});

/** `review.collections.detail` input — collection id (cuid2). */
export const reviewCollectionDetailInputSchema = z.object({
  id: idSchema,
});
