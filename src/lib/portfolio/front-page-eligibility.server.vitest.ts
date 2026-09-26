import { describe, expect, it } from 'vitest';

import { canJoinFrontPage } from './front-page-eligibility.ts';

describe('canJoinFrontPage', () => {
  it('requires ready, published, alt, and category', () => {
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: 'Sunset',
        category: 'landscape',
      }),
    ).toBe(true);
    expect(
      canJoinFrontPage({
        status: 'ready',
        published: true,
        alt: '',
        category: 'landscape',
      }),
    ).toBe(false);
  });
});
