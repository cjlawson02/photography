import { reviewCollectionInsertSchema } from '../../db/schema/types.ts';

/** `review.collections.create` input — slug required; title and expiresAt optional. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema.pick({
  slug: true,
  title: true,
  expiresAt: true,
});
