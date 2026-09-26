import { z } from 'zod/v4';

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
    personName: z.string(),
    expiresAtLocal: z.string(),
    notes: z.string(),
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
    const personName = data.personName.trim();
    if (personName !== '') {
      body.personName = personName;
    }
    const notes = data.notes.trim();
    if (notes !== '') {
      body.notes = notes;
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

export const reviewCollectionPersonNameFieldSchema = z.object({
  personName: z.string().transform(trimmedNullableText),
});

export const reviewCollectionNotesFieldSchema = z.object({
  notes: z.string().transform(trimmedNullableText),
});

export const reviewCollectionExpiresFieldSchema = z
  .object({
    expiresAtLocal: z.string(),
  })
  .superRefine((data, ctx) => {
    const trimmed = data.expiresAtLocal.trim();
    if (trimmed === '') return;
    try {
      parseDatetimeLocalToMs(trimmed);
    } catch {
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

/** Library inspector text fields (autosaved individually; not the PATCH body). */
export const portfolioInspectorFormSchema = z.object({
  alt: z.string(),
  title: z.string(),
  caption: z.string(),
  sortOrder: z.string().regex(/^\s*(-?\d+)?\s*$/, 'Use a whole number, or leave empty.'),
});

export type PortfolioInspectorFormValues = z.infer<typeof portfolioInspectorFormSchema>;

export type PortfolioInspectorTextField = keyof PortfolioInspectorFormValues;

/**
 * Close-out retention purge form → `review.collections.purgeRounds` body fields
 * (caller supplies `collectionId`). Requires the exact shoot slug and at least one round.
 */
export function reviewPurgeRoundsFormSchema(expectedSlug: string) {
  return z
    .object({
      purgeProofs: z.boolean(),
      purgeFinals: z.boolean(),
      confirmSlug: z.string(),
    })
    .superRefine((data, ctx) => {
      if (!data.purgeProofs && !data.purgeFinals) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose proofs and/or finals to purge.',
          path: ['purgeProofs'],
        });
      }
      if (data.confirmSlug.trim() !== expectedSlug) {
        ctx.addIssue({
          code: 'custom',
          message: 'Type the shoot slug exactly to confirm.',
          path: ['confirmSlug'],
        });
      }
    })
    .transform((data) => ({
      proofs: data.purgeProofs,
      finals: data.purgeFinals,
      cleanupR2: true as const,
      confirmSlug: data.confirmSlug.trim(),
    }));
}

export type ReviewPurgeRoundsFormValues = z.input<ReturnType<typeof reviewPurgeRoundsFormSchema>>;

/** Validated field value → PATCH fragment (empty → null). */
export function portfolioInspectorPatchFromField(
  field: PortfolioInspectorTextField,
  raw: string,
):
  | { alt: string | null }
  | { title: string | null }
  | { caption: string | null }
  | {
      sortOrder: number | null;
    } {
  const text = trimmedNullableText(raw);
  switch (field) {
    case 'sortOrder':
      return { sortOrder: text === null ? null : Number.parseInt(text, 10) };
    case 'alt':
      return { alt: text };
    case 'title':
      return { title: text };
    case 'caption':
      return { caption: text };
  }
}
