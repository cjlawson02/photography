import { z } from 'zod/v4';

import { idSchema, reviewCollectionInsertSchema } from '../../db/schema/types.ts';
import { reviewSlugPrefixSchema } from '../review/slug.ts';

/** `review.collections.create` — server assigns slug; optional prefix + title/expiry only. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema
  .pick({
    title: true,
    expiresAt: true,
  })
  .extend({
    slugPrefix: reviewSlugPrefixSchema.optional(),
  })
  .strict();

/** `review.collections.detail` input — collection id (cuid2). */
export const reviewCollectionDetailInputSchema = z.object({
  id: idSchema,
});
