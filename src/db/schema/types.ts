import { isCuid } from '@paralleldrive/cuid2';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

import { PortfolioPhotos } from './portfolio/photos.ts';
import { ReviewPhotos } from './review/photos.ts';
import { photoStatuses } from './photo-status.ts';

/** cuid2 primary key shape (matches `@paralleldrive/cuid2`). */
export const idSchema = z.string().refine((value) => isCuid(value), 'Expected cuid2 id');

export const requiredTrimmedString = z.string().trim().min(1);

export const optionalTrimmedString = z.string().trim().min(1).optional();

export const photoStatusSchema = z.enum(photoStatuses);

const photoInsertBase = {
	id: true as const,
	createdAt: true as const,
	updatedAt: true as const,
};

const photoUpdateOmit = {
	id: true as const,
	createdAt: true as const,
};

export const portfolioPhotoSelectSchema = createSelectSchema(PortfolioPhotos, {
	status: photoStatusSchema,
	mimeType: z.string().nullable(),
});

export const portfolioPhotoInsertSchema = createInsertSchema(PortfolioPhotos, {
	status: photoStatusSchema,
	mimeType: optionalTrimmedString.nullable().optional(),
}).omit(photoInsertBase);

export const portfolioPhotoUpdateSchema = createUpdateSchema(PortfolioPhotos, {
	status: photoStatusSchema.optional(),
	mimeType: optionalTrimmedString.nullable().optional(),
}).omit(photoUpdateOmit);

export const reviewPhotoSelectSchema = createSelectSchema(ReviewPhotos, {
	status: photoStatusSchema,
	mimeType: z.string().nullable(),
});

export const reviewPhotoInsertSchema = createInsertSchema(ReviewPhotos, {
	status: photoStatusSchema,
	mimeType: optionalTrimmedString.nullable().optional(),
}).omit(photoInsertBase);

export const reviewPhotoUpdateSchema = createUpdateSchema(ReviewPhotos, {
	status: photoStatusSchema.optional(),
	mimeType: optionalTrimmedString.nullable().optional(),
}).omit(photoUpdateOmit);

export type PortfolioPhotoSelect = z.infer<typeof portfolioPhotoSelectSchema>;
export type PortfolioPhotoInsert = z.infer<typeof portfolioPhotoInsertSchema>;
export type PortfolioPhotoUpdate = z.infer<typeof portfolioPhotoUpdateSchema>;

export type ReviewPhotoSelect = z.infer<typeof reviewPhotoSelectSchema>;
export type ReviewPhotoInsert = z.infer<typeof reviewPhotoInsertSchema>;
export type ReviewPhotoUpdate = z.infer<typeof reviewPhotoUpdateSchema>;
