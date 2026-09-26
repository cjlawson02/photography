import { describe, expect, it } from 'vitest';

import {
  portfolioInspectorFormSchema,
  portfolioInspectorPatchFromField,
  reviewCollectionCreateFormSchema,
} from './admin-form-schemas.ts';

describe('reviewCollectionCreateFormSchema', () => {
  it('maps empty form fields to an empty create body', () => {
    expect(
      reviewCollectionCreateFormSchema.parse({
        slugPrefix: '',
        title: '',
        personName: '',
        expiresAtLocal: '',
        notes: '',
      }),
    ).toEqual({});
  });

  it('rejects invalid expiry datetime-local values', () => {
    const result = reviewCollectionCreateFormSchema.safeParse({
      slugPrefix: '',
      title: '',
      personName: '',
      expiresAtLocal: 'not-a-date',
      notes: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('portfolioInspectorFormSchema', () => {
  it('accepts whole numbers or empty sort order', () => {
    const base = { alt: '', title: '', caption: '' };
    expect(portfolioInspectorFormSchema.safeParse({ ...base, sortOrder: ' 12 ' }).success).toBe(
      true,
    );
    expect(portfolioInspectorFormSchema.safeParse({ ...base, sortOrder: '' }).success).toBe(true);
    expect(portfolioInspectorFormSchema.safeParse({ ...base, sortOrder: '1.5' }).success).toBe(
      false,
    );
  });

  it('maps fields to trimmed nullable patches', () => {
    expect(portfolioInspectorPatchFromField('alt', '  Dunes ')).toEqual({ alt: 'Dunes' });
    expect(portfolioInspectorPatchFromField('caption', '   ')).toEqual({ caption: null });
    expect(portfolioInspectorPatchFromField('sortOrder', ' -3 ')).toEqual({ sortOrder: -3 });
  });
});
