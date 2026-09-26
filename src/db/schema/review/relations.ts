import { relations } from 'drizzle-orm';

import { ReviewCollections } from './collections.ts';
import { ReviewPhotos } from './photos.ts';

export const reviewCollectionsRelations = relations(ReviewCollections, ({ many }) => ({
  photos: many(ReviewPhotos),
}));

export const reviewPhotosRelations = relations(ReviewPhotos, ({ one }) => ({
  collection: one(ReviewCollections, {
    fields: [ReviewPhotos.collectionId],
    references: [ReviewCollections.id],
  }),
}));
