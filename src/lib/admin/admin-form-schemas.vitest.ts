import { describe, expect, it } from 'vitest';

import { reviewCollectionCreateFormSchema } from './admin-form-schemas.ts';

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
