import { isCuid } from '@paralleldrive/cuid2';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

import { PortfolioPhotos } from './portfolio/photos.ts';
import { ReviewCollections } from './review/collections.ts';
import { ReviewPhotos } from './review/photos.ts';
import { PORTFOLIO_CATEGORIES } from './portfolio/categories.ts';
import { photoStatuses } from './photo-status.ts';
import { selectionStatuses } from './review/selection-status.ts';

/** cuid2 primary key shape (matches `@paralleldrive/cuid2`). */
export const idSchema = z.string().refine((value) => isCuid(value), 'Expected cuid2 id');

export const requiredTrimmedString = z.string().trim().min(1);

export const optionalTrimmedString = z.string().trim().min(1).optional();

export const photoStatusSchema = z.enum(photoStatuses);

export const selectionStatusSchema = z.enum(selectionStatuses);

export const portfolioCategorySchema = z.enum(PORTFOLIO_CATEGORIES);

/** URL slug for `/review/{slug}` — non-empty trimmed string. */
export const slugSchema = requiredTrimmedString;

const immutableTimestamps = {
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
};

const updateOmitImmutable = {
  id: true as const,
  createdAt: true as const,
};

export const portfolioPhotoSelectSchema = createSelectSchema(PortfolioPhotos, {
  status: photoStatusSchema,
  mimeType: z.string().nullable(),
  published: z.boolean(),
  category: portfolioCategorySchema.nullable(),
  sortOrder: z.number().int().nullable(),
  hero: z.boolean(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
});

export const portfolioPhotoInsertSchema = createInsertSchema(PortfolioPhotos, {
  status: photoStatusSchema,
  mimeType: optionalTrimmedString.nullable().optional(),
  published: z.boolean().optional(),
  category: portfolioCategorySchema.nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
  hero: z.boolean().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  alt: optionalTrimmedString.nullable().optional(),
  title: optionalTrimmedString.nullable().optional(),
  caption: optionalTrimmedString.nullable().optional(),
}).omit(immutableTimestamps);

export const portfolioPhotoUpdateSchema = createUpdateSchema(PortfolioPhotos, {
  status: photoStatusSchema.optional(),
  mimeType: optionalTrimmedString.nullable().optional(),
  published: z.boolean().optional(),
  category: portfolioCategorySchema.nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
  hero: z.boolean().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  alt: optionalTrimmedString.nullable().optional(),
  title: optionalTrimmedString.nullable().optional(),
  caption: optionalTrimmedString.nullable().optional(),
}).omit(updateOmitImmutable);

export const reviewCollectionSelectSchema = createSelectSchema(ReviewCollections, {
  slug: slugSchema,
  title: z.string().nullable(),
  expiresAt: z.number().int().nullable(),
});

export const reviewCollectionInsertSchema = createInsertSchema(ReviewCollections, {
  slug: slugSchema,
  title: optionalTrimmedString.nullable().optional(),
  expiresAt: z.number().int().nullable().optional(),
}).omit(immutableTimestamps);

export const reviewCollectionUpdateSchema = createUpdateSchema(ReviewCollections, {
  slug: slugSchema.optional(),
  title: optionalTrimmedString.nullable().optional(),
  expiresAt: z.number().int().nullable().optional(),
}).omit(updateOmitImmutable);

export const reviewPhotoSelectSchema = createSelectSchema(ReviewPhotos, {
  collectionId: idSchema,
  status: photoStatusSchema,
  mimeType: z.string().nullable(),
  selectionStatus: selectionStatusSchema,
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});

export const reviewPhotoInsertSchema = createInsertSchema(ReviewPhotos, {
  collectionId: idSchema,
  status: photoStatusSchema,
  mimeType: optionalTrimmedString.nullable().optional(),
  selectionStatus: selectionStatusSchema.optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
}).omit(immutableTimestamps);

export const reviewPhotoUpdateSchema = createUpdateSchema(ReviewPhotos, {
  collectionId: idSchema.optional(),
  status: photoStatusSchema.optional(),
  mimeType: optionalTrimmedString.nullable().optional(),
  selectionStatus: selectionStatusSchema.optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
}).omit(updateOmitImmutable);

export type PortfolioPhotoSelect = z.infer<typeof portfolioPhotoSelectSchema>;
export type PortfolioPhotoInsert = z.infer<typeof portfolioPhotoInsertSchema>;
export type PortfolioPhotoUpdate = z.infer<typeof portfolioPhotoUpdateSchema>;

export type ReviewCollectionSelect = z.infer<typeof reviewCollectionSelectSchema>;
export type ReviewCollectionInsert = z.infer<typeof reviewCollectionInsertSchema>;
export type ReviewCollectionUpdate = z.infer<typeof reviewCollectionUpdateSchema>;

export type ReviewPhotoSelect = z.infer<typeof reviewPhotoSelectSchema>;
export type ReviewPhotoInsert = z.infer<typeof reviewPhotoInsertSchema>;
export type ReviewPhotoUpdate = z.infer<typeof reviewPhotoUpdateSchema>;
