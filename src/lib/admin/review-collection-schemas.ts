import { reviewCollectionInsertSchema } from '../../db/schema/types.ts';

/** POST `/admin/api/review/collections` — slug required; title and expiresAt optional. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema.pick({
	slug: true,
	title: true,
	expiresAt: true,
});
