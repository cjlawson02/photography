import { describe, expect, it } from 'vitest';

import { reviewCollectionCreateFormSchema } from './admin-form-schemas.ts';

describe('reviewCollectionCreateFormSchema', () => {
  it('maps empty form fields to an empty create body', () => {
    expect(
      reviewCollectionCreateFormSchema.parse({
        slugPrefix: '',
        title: '',
        expiresAtLocal: '',
      }),
    ).toEqual({});
  });

  it('rejects invalid expiry datetime-local values', () => {
    const result = reviewCollectionCreateFormSchema.safeParse({
      slugPrefix: '',
      title: '',
      expiresAtLocal: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});
