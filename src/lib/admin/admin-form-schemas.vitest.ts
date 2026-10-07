import { describe, expect, it } from 'vitest';

import {
  adminPhotoUploadFormSchema,
  portfolioInspectorFormSchema,
  portfolioInspectorPatchFromField,
  reviewCollectionCreateFormSchema,
  reviewPurgeRoundsFormSchema,
} from './admin-form-schemas.ts';

describe('adminPhotoUploadFormSchema', () => {
  it('requires at least one non-empty file', () => {
    expect(adminPhotoUploadFormSchema.safeParse({ files: undefined }).success).toBe(false);

    const emptyList = {
      length: 0,
      item: () => null,
      *[Symbol.iterator]() {},
    };
    expect(adminPhotoUploadFormSchema.safeParse({ files: emptyList }).success).toBe(false);

    const file = new File(['bytes'], 'a.jpg', { type: 'image/jpeg' });
    const list = {
      0: file,
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      *[Symbol.iterator]() {
        yield file;
      },
    };
    expect(adminPhotoUploadFormSchema.safeParse({ files: list }).success).toBe(true);
  });
});

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

describe('reviewPurgeRoundsFormSchema', () => {
  const schema = reviewPurgeRoundsFormSchema('alex-wedding-x7k2');

  it('requires at least one round and the exact slug', () => {
    expect(
      schema.safeParse({ purgeProofs: false, purgeFinals: false, confirmSlug: 'alex-wedding-x7k2' })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ purgeProofs: true, purgeFinals: false, confirmSlug: 'wrong' }).success,
    ).toBe(false);
  });

  it('maps checked rounds to the purgeRounds mutation body', () => {
    expect(
      schema.parse({
        purgeProofs: true,
        purgeFinals: false,
        confirmSlug: '  alex-wedding-x7k2  ',
      }),
    ).toEqual({
      proofs: true,
      finals: false,
      cleanupR2: true,
      confirmSlug: 'alex-wedding-x7k2',
    });
  });
});

describe('portfolioInspectorFormSchema', () => {
  it('accepts whole numbers or empty sort order', () => {
    const base = { alt: '', title: '' };
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
    expect(portfolioInspectorPatchFromField('title', '   ')).toEqual({ title: null });
    expect(portfolioInspectorPatchFromField('sortOrder', ' -3 ')).toEqual({ sortOrder: -3 });
  });
});
