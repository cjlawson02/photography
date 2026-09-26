import { z } from 'zod/v4';

import {
  idSchema,
  reviewCollectionInsertSchema,
  reviewCollectionUpdateSchema,
  reviewJobStatusSchema,
} from '../../db/schema/types.ts';
import { reviewSlugPrefixSchema } from '../review/slug.ts';
import { cleanupR2Field } from './cleanup-r2-field.ts';

/** `review.collections.create` — server assigns slug; optional prefix + title/expiry only. */
export const reviewCollectionCreateBodySchema = reviewCollectionInsertSchema
  .pick({
    title: true,
    personName: true,
    expiresAt: true,
    notes: true,
  })
  .extend({
    slugPrefix: reviewSlugPrefixSchema.optional(),
  })
  .strict();

/** `review.collections.update` body — setup fields (slug is immutable). */
export const reviewCollectionAdminUpdateBodySchema = reviewCollectionUpdateSchema
  .pick({ title: true, personName: true, notes: true, expiresAt: true })
  .refine((value) => Object.keys(value).length > 0, 'At least one field required');

export type ReviewCollectionAdminUpdateBody = z.infer<typeof reviewCollectionAdminUpdateBodySchema>;

export const reviewCollectionTransitionInputSchema = z.object({
  id: idSchema,
  to: reviewJobStatusSchema,
});

/** `review.collections.detail` input — collection id (cuid2). */
export const reviewCollectionDetailInputSchema = z.object({
  id: idSchema,
});

export const reviewCollectionIdInputSchema = z.object({
  id: idSchema,
});

export const reviewCollectionUpdateInputSchema = z.object({
  id: idSchema,
  data: reviewCollectionAdminUpdateBodySchema,
});

/** `review.collections.deletePhoto` — scoped to one collection. */
export const reviewCollectionDeletePhotoInputSchema = z.object({
  collectionId: idSchema,
  photoId: idSchema,
  cleanupR2: cleanupR2Field,
});

export const reviewLinkFinalToPickInputSchema = z.object({
  collectionId: idSchema,
  finalPhotoId: idSchema,
  pickPhotoId: idSchema,
});

export const reviewMarkDeliveredInputSchema = z.object({
  id: idSchema,
});

export const reviewPromoteFinalInputSchema = z.object({
  collectionId: idSchema,
  finalPhotoId: idSchema,
});

export const reviewPurgeRoundsInputSchema = z.object({
  collectionId: idSchema,
  proofs: z.boolean(),
  finals: z.boolean(),
  cleanupR2: cleanupR2Field,
  confirmSlug: z.string().min(1),
});
