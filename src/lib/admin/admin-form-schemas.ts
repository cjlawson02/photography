import { z } from 'zod/v4';

import { portfolioCategorySchema } from '../../db/schema/types.ts';
import { isPortfolioCategory } from '../portfolio/categories.ts';
import { reviewSlugPrefixSchema } from '../review/slug.ts';
import { parseDatetimeLocalToMs } from './admin-form-datetime.ts';
import { reviewCollectionCreateBodySchema } from './review-collection-schemas.ts';

function trimmedNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Create-collection form → `review.collections.create` body. */
export const reviewCollectionCreateFormSchema = z
  .object({
    slugPrefix: z.string(),
    title: z.string(),
    expiresAtLocal: z.string(),
  })
  .superRefine((data, ctx) => {
    const prefix = data.slugPrefix.trim();
    if (prefix !== '') {
      const parsed = reviewSlugPrefixSchema.safeParse(prefix);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({ ...issue, path: ['slugPrefix'] });
        }
      }
    }
    const expires = data.expiresAtLocal.trim();
    if (expires !== '') {
      try {
        parseDatetimeLocalToMs(expires);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid expiry date.',
          path: ['expiresAtLocal'],
        });
      }
    }
  })
  .transform((data) => {
    const body: z.infer<typeof reviewCollectionCreateBodySchema> = {};
    const prefix = data.slugPrefix.trim();
    if (prefix !== '') {
      body.slugPrefix = reviewSlugPrefixSchema.parse(prefix);
    }
    const title = data.title.trim();
    if (title !== '') {
      body.title = title;
    }
    const expires = data.expiresAtLocal.trim();
    if (expires !== '') {
      body.expiresAt = parseDatetimeLocalToMs(expires) ?? undefined;
    }
    return body;
  });

export type ReviewCollectionCreateFormValues = z.input<typeof reviewCollectionCreateFormSchema>;

export const reviewCollectionTitleFieldSchema = z.object({
  title: z.string().transform(trimmedNullableText),
});

export const reviewCollectionExpiresFieldSchema = z
  .object({
    expiresAtLocal: z.string(),
  })
  .superRefine((data, ctx) => {
    const trimmed = data.expiresAtLocal.trim();
    if (trimmed === '') return;
    const ms = new Date(trimmed).getTime();
    if (Number.isNaN(ms)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid expiry date.',
        path: ['expiresAtLocal'],
      });
    }
  })
  .transform((data) => ({
    expiresAt: parseDatetimeLocalToMs(data.expiresAtLocal),
  }));

/** Portfolio row inline-edit state (not the PATCH body). */
export const portfolioPhotoAdminRowFormSchema = z.object({
  published: z.boolean(),
  alt: z.string(),
  title: z.string(),
  caption: z.string(),
  category: z.union([z.literal(''), portfolioCategorySchema]),
  sortOrder: z.string(),
  hero: z.boolean(),
});

export type PortfolioPhotoAdminRowFormValues = z.infer<typeof portfolioPhotoAdminRowFormSchema>;

export function portfolioRowFormValuesFromPhoto(photo: {
  published: boolean;
  alt: string | null;
  title: string | null;
  caption: string | null;
  category: string | null;
  sortOrder: number | null;
  hero: boolean;
}): PortfolioPhotoAdminRowFormValues {
  return {
    published: photo.published,
    alt: photo.alt ?? '',
    title: photo.title ?? '',
    caption: photo.caption ?? '',
    category: photo.category != null && isPortfolioCategory(photo.category) ? photo.category : '',
    sortOrder: photo.sortOrder == null ? '' : String(photo.sortOrder),
    hero: photo.hero,
  };
}

export function parsePortfolioRowSortOrder(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Sort order must be an integer.');
  }
  return parsed;
}

export function portfolioRowPatchFromField(
  field: keyof PortfolioPhotoAdminRowFormValues,
  values: PortfolioPhotoAdminRowFormValues,
): Record<string, unknown> {
  switch (field) {
    case 'published':
      return { published: values.published };
    case 'alt':
      return { alt: trimmedNullableText(values.alt) };
    case 'title':
      return { title: trimmedNullableText(values.title) };
    case 'caption':
      return { caption: trimmedNullableText(values.caption) };
    case 'category':
      return { category: values.category === '' ? null : values.category };
    case 'sortOrder':
      return { sortOrder: parsePortfolioRowSortOrder(values.sortOrder) };
    case 'hero':
      return { hero: values.hero };
    default:
      return {};
  }
}
